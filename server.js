const express = require("express");
var jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const path = require('path');
const bcrypt = require("bcrypt")
const authMiddleware = require("./middlewares.js")

const searchRouter = require('./routers/searchRoute.js');


//middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3000;
//models
const userModel = require("./models/user");

require("dotenv").config();

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

app.use('/api', searchRouter); // Bu router için '/api' ön eki eklenmiştir.


require("./routers/rooterManager.js")(app);

app.get("/users", async (req, res) => {
  try {
    const users = await userModel.find().populate("role", "name");

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
    const userFound = await userModel.findOne({ email }).populate("role", "name");

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


app.get("/rol", authMiddleware, async (req, res) => {
  const user = await userModel.findById(req.user.id).populate("role");
  return res.json(user.role.name);
});










