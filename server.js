const express = require("express");
var jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const path = require('path');
const bcrypt = require("bcrypt")




const sendEmail = require("./utils/sendEmail")

const teamModel = require("./models/team")



//middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3000;

//models
const Usermodel = require("./models/user");
const Rolemodel = require("./models/role");

require("dotenv").config();

const authMiddleware = require("./middlewares.js");

app.listen(PORT, () => console.log(`calisti http://localhost:${PORT}`));

require("./routers/rooterManager.js")(app);


app.post("/user/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const foundRole = await Rolemodel.findOne({ name: role });
    if (!foundRole) {
      return res.status(400).json({ error: "Belirtilen rol bulunamadı" });
    }

    const newUser = new Usermodel({
      email: email,
      password: password,
      role: foundRole._id, // Role belgesine referans
    });

    const savedUser = await newUser.save();

    res.status(201).json(savedUser);
  } catch (error) {
    console.error("Kullanıcı kaydı oluşturma hatası:", error);
    res.status(500).json({ error: "Kullanıcı kaydı oluşturulamadı" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await Usermodel.find().populate("role", "name");

    const usersWithRoleNames = users.map((user) => ({
      email: user.email,
      role: user.role ? user.role.name : null,
    }));
    console.log(usersWithRoleNames);

    res.status(200).json(usersWithRoleNames);
  } catch (error) {
    console.error("Kullanıcılar getirme hatası:", error);
    res.status(500).json({ error: "Kullanıcılar getirilemedi" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userFound = await Usermodel.findOne({ email }).populate("role", "name");
    if (!userFound) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı veya bilgiler geçersiz." });
    }
    const role = userFound.role ? userFound.role.name : null;
    //await bcrypt.compare(password, userFound.password)

    if (await bcrypt.compare(password, userFound.password)) {

      const accessToken = jwt.sign(
        { id: userFound.id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1000s" }
      );

      const refreshToken = jwt.sign(
        { id: userFound.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "3000s" }
      );

      return res.status(200).json({ accessToken, refreshToken, role });
    } else {
      return res.status(401).json({ message: "Bilgiler geçersiz." });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});



app.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  console.log("eski refreshToken : " + refreshToken);
  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, data) => {
    if (err) {
      console.log(err);
      return res.status(400).json(err);
    }
    const accessToken = jwt.sign(
      { id: data.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1000s" }
    );

    const refreshToken = jwt.sign(
      { id: data.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "3000s" }
    );

    console.log("yeni refreshToken : " + refreshToken + "\n");

    return res.status(200).json({ accessToken, refreshToken });
  });
});

app.get("/auth", authMiddleware, (req, res) => {
  return res.sendStatus(200);
});

app.get("/rol", authMiddleware, async (req, res) => {
  const user = await Usermodel.findById(req.user.id).populate("role");

  return res.json(user.role.name);
});





app.post("/auth/admin/register", async (req, res) => {
  try {

    const { email, password } = req.body;

    const hasUser = await userModel.findOne({ email: email });

    if (hasUser) {
      return res.status(400).json("User already exists.");
    }
    const getRole = await roleModel.findOne({ name: "admin" });
    console.log(getRole._id)


    const hashedPassword = await bcrypt.hash(password, 10);


    const newUser = new userModel({
      email: email,
      password: hashedPassword,
      role: getRole._id
    });

    const savedUser = await newUser.save();

    return res.status(200).json(savedUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/auth/user/register/:teamName", async (req, res) => {

  try {
    console.log("user")
    const teamName = req.params.teamName;



    const { email, role } = req.body;
    console.log("req.body", req.body.newMember)

    const user = await Usermodel.findOne({ email })
    const getRole = await Rolemodel.findOne({ name: "user" });

    if (user)
      return res.status(400).send("user already exists")

    // const team = await Teammodel.findOne({ teamName });
    // if (!team) {
    //   return res.status(404).json({ message: "Takım bulunamadı" });
    // }
    console.log("ls")
    console.log(req.body.hasOwnProperty('role'))
    console.log(getRole._id)
    console.log(email)


    if (!req.body.hasOwnProperty('role')) {
      //console.log("sa")
      var newUser = new Usermodel({ email: email, role: getRole._id });
      await newUser.save();
    }
    else {
      //console.log("sa")
      var roleObject = await Rolemodel.findOne({ name: role });
      var newUser = new Usermodel({ email: email, role: roleObject._id });
      await newUser.save();
    }
    console.log("aas")

    console.log(newUser._id)

    const token = jwt.sign({ userId: newUser._id }, process.env.EMAIL_SECRET, { expiresIn: "15d" });

    newUser.emailToken = token;
    await newUser.save();

    const url = `https://ahmetgh-deploy-deploy.onrender.com/auth/verify?token=${token}&teamName=${teamName}`;
    await sendEmail(email, "Şifrenizi belirlemek için bağlantıya tıklayınız.", url);

    res.sendStatus(200);

  } catch (error) {
    res.status(500).send('Bir hata oluştu.');
  }

});


app.get('/auth/verify', async (req, res) => {
  try {
    console.log("verify ")
    const { token, teamName } = req.query;
    console.log("token", token)

    console.log("teamName", teamName)


    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await Usermodel.findOne({ _id: decoded.userId, emailToken: token });
    if (!user) {
      return res.status(400).send('Geçersiz token.');
    }
    const team = await teamModel.findOne({ teamName });

    user.team.push(team._id);
    await user.save();

    team.members.push(user._id);
    await team.save();


    res.redirect(`https://deployfe-ahmetghs-projects.vercel.app/auth/reset-password/${token}`);
  } catch (error) {
    res.status(500).send('Bir hata oluştu.');
  }
});



app.post("/auth/set-password", async (req, res) => {

  try {
    const { password, token } = req.body;
    console.log("pass");
    console.log(password);
    console.log(token);

    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await Usermodel.findOne({ _id: decoded.userId, emailToken: token });
    if (!user) {
      return res.status(400).send('Geçersiz token.');
    }
    console.log(user)
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.emailToken = undefined;
    user.isActive = true
    await user.save();

    res.redirect('https://deployfe-ahmetghs-projects.vercel.app/login');
  } catch (error) {
    res.status(500).send({ error });
  }
});


app.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const User = await Usermodel.findOne({ email });
    if (!User)
      return res.send({ message_header: "Geçersiz mail adresi!", message: "Girmiş olduğunuz e-mail adresinin sistemde kaydı bulunmamaktadır!" });

    const token = jwt.sign({ userId: User._id }, process.env.EMAIL_SECRET, { expiresIn: "15d" });

    const Url = `https://ahmetgh-deploy-deploy.onrender.com/auth/verify-forget?token=${token}`

    await sendEmail(email, "Şifre sıfırlama", Url)

    res.status(200).json({ message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' });
    //işlem tamamlandı sayfasına yönlendir
  } catch (error) {
    res.status(500).json(error);

  }
})

app.get('/auth/verify-forget', async (req, res) => {
  try {

    const token = req.query.token;
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);


    const user = await Usermodel.findOne({ _id: decoded.userId });
    if (!user) {
      return res.status(400).send('Geçersiz token.');
    }
    res.redirect(`https://deployfe-ahmetghs-projects.vercel.app/auth/reset-password/${token}`);
  } catch (error) {
    res.status(500).send(error);
  }
});




app.post("/auth/reset-password", async (req, res) => {

  try {
    const { password, token } = req.body;

    const decoded = jwt.verify(token, process.env.EMAIL_SECRET)
    const user = await Usermodel.findOne({ _id: decoded.userId });
    if (!user) {
      return res.status(400).send('Geçersiz token.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.emailToken = undefined;
    user.isActive = true
    await user.save();

    res.status(200).json("Şifre başarıyla sıfırlandı");
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }

})

