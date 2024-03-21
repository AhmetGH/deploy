var express = require("express");
var router = express.Router();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userModel = require("../models/user");
const sendEmail = require("../utils/sendEmail");
const roleModel = require("../models/role");
const teamModel = require("../models/team");
const authMiddleware = require("../middlewares");

router.get("/", authMiddleware, (req, res) => {
  return res.sendStatus(200);
});

router.post("/admin/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hasUser = await userModel.findOne({ email: email });

    if (hasUser) {
      return res.status(400).json("User already exists.");
    }
    const getRole = await roleModel.findOne({ name: "admin" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new userModel({
      email: email,
      password: hashedPassword,
      role: getRole._id,
    });

    const savedUser = await newUser.save();

    return res.status(200).json(savedUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/user/register/:teamName", async (req, res) => {
  try {
    console.log("user");
    const teamName = req.params.teamName;

    const { email, role } = req.body;

    console.log("req.body", req.body.newMember);

    const user = await userModel.findOne({ email });
    if (user) {
      console.log("users exist");
      return res.status(400).send("Kullanıcı zaten var");
    }

    const getRole = await roleModel.findOne({ name: "user" });
    if (!getRole) return res.status(400).send("Kullanıcı rolü bulunamadı");

    let newUser;

    if (!role) {
      console.log(1);
      newUser = new userModel({ email: email, role: getRole._id });
    } else {
      console.log(2);
      var roleObject = await roleModel.findOne({ name: role });
      newUser = new userModel({ email: email, role: roleObject._id });
    }

    console.log(newUser);

    const token = jwt.sign({ userId: newUser._id }, process.env.EMAIL_SECRET, {
      expiresIn: "15d",
    });

    newUser.emailToken = token;
    await newUser.save();

    const url = `https://ahmetgh-deploy-deploy.onrender.com/auth/verify?token=${token}&teamName=${teamName}`;
    await sendEmail(
      email,
      "Şifrenizi belirlemek için bağlantıya tıklayınız.",
      url
    );

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).send("Bir hata oluştu.");
  }
});

router.get("/verify", async (req, res) => {
  try {
    console.log("verify ");
    const { token, teamName } = req.query;

    console.log("teamName", teamName);

    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await userModel.findOne({
      _id: decoded.userId,
      emailToken: token,
    });
    if (!user) {
      return res.status(400).send("Geçersiz token.");
    }
    const team = await teamModel.findOne({ teamName });

    user.team.push(team._id);
    await user.save();

    team.members.push(user._id);
    await team.save();

    res.redirect(
      `https://deployfe-ahmetghs-projects.vercel.app/auth/reset-password/${token}`
    );
  } catch (error) {
    res.status(500).send("Bir hata oluştu.");
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user)
      return res.send({
        message_header: "Geçersiz mail adresi!",
        message:
          "Girmiş olduğunuz e-mail adresinin sistemde kaydı bulunmamaktadır!",
      });

    const token = jwt.sign({ userId: user._id }, process.env.EMAIL_SECRET, {
      expiresIn: "15d",
    });

    const url = `https://ahmetgh-deploy-deploy.onrender.com/auth/verify-forget?token=${token}`;

    await sendEmail(email, "Şifre sıfırlama", url);

    res.status(200).json({
      message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi",
    });
    //işlem tamamlandı sayfasına yönlendir
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/verify-forget", async (req, res) => {
  try {
    const token = req.query.token;
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);

    const user = await userModel.findOne({ _id: decoded.userId });
    if (!user) {
      return res.status(400).send("Geçersiz token.");
    }
    res.redirect(
      `https://deployfe-ahmetghs-projects.vercel.app/auth/reset-password/${token}`
    );
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { password, token } = req.body;

    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await userModel.findOne({ _id: decoded.userId });
    if (!user) {
      return res.status(400).send("Geçersiz token.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.emailToken = undefined;
    user.isActive = true;
    await user.save();

    res.status(200).json("Şifre başarıyla sıfırlandı");
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});

module.exports = router;
