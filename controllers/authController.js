const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userModel = require("../models/user");
const sendEmail = require("../utils/sendEmail");
const roleModel = require("../models/role");
const teamModel = require("../models/team");

module.exports.verifyToken = (req, res) => {
  return res.sendStatus(200);
};

module.exports.adminRegister = async (req, res) => {
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
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.userRegister = async (req, res) => {
  try {
    const teamName = req.params.teamName;

    const { email, role } = req.body;

    const user = await userModel.findOne({ email });
    if (user) {
      return res.status(400).send("Kullanıcı zaten var");
    }

    const getRole = await roleModel.findOne({ name: "user" });
    if (!getRole) return res.status(400).send("Kullanıcı rolü bulunamadı");

    let newUser;

    if (!role) {
      newUser = new userModel({ email: email, role: getRole._id });
    } else {
      var roleObject = await roleModel.findOne({ name: role });
      newUser = new userModel({ email: email, role: roleObject._id });
    }

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
    res.status(500).json(error);
  }
};

module.exports.verify = async (req, res) => {
  try {
    const { token, teamName } = req.query;

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
    res.status(500).json(error);
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message:
          "Girmiş olduğunuz e-mail adresinin sistemde kaydı bulunmamaktadır!",
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.EMAIL_SECRET, {
      expiresIn: "15d",
    });

    const url = `https://ahmetgh-deploy-deploy.onrender.com/auth/verify-forget?token=${token}`;

    await sendEmail(email, "Şifre sıfırlama", url);

    res.status(200).json({
      message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi",
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.verifyForget = async (req, res) => {
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
};

module.exports.resetPassword = async (req, res) => {
  try {
    const { password, token } = req.body;

    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await userModel.findOne({ _id: decoded.userId });
    if (!user) {
      return res.status(400).send("Geçersiz token.");
    }

    if (await bcrypt.compare(password, user.password)) {
      return res
        .status(401)
        .json({ message: "Şifreniz eski şifrenizle aynı!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.emailToken = undefined;
    user.isActive = true;
    await user.save();

    res.status(200).json("Şifre başarıyla sıfırlandı");
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.getAuthRole = async (req, res) => {
  const user = await userModel.findById(req.user.id).populate("role");
  return res.json(user.role.name);
};

module.exports.authRefreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    }
    const accessToken = jwt.sign(
      { id: data.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1000s" }
    );

    const refreshToken = jwt.sign(
      { id: data.id },
      process.env.REFRESH_TOKEN_SECRET
    );

    return res.status(200).json({ accessToken, refreshToken });
  });
};

module.exports.authLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userFound = await userModel
      .findOne({ email })
      .populate("role", "name");

    if (!userFound) {
      return res
        .status(401)
        .json({ message: "Kullanıcı bulunamadı veya bilgiler geçersiz." });
    }
    const role = userFound.role ? userFound.role.name : null;

    if (await bcrypt.compare(password, userFound.password)) {
      const accessToken = jwt.sign(
        { id: userFound.id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1000s" }
      );

      const refreshToken = jwt.sign(
        { id: userFound.id },
        process.env.REFRESH_TOKEN_SECRET
      );
      return res.status(200).json({ accessToken, refreshToken, role });
    } else {
      return res.status(401).json({ message: "Bilgiler geçersiz." });
    }
  } catch (error) {
    res.sendStatus(500);
  }
};
