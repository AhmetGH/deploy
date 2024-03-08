const express = require("express");
var jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");

//middlewares
app.use(cors());
app.use(express.json());

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

    const userFound = await Usermodel.findOne({
      email: email,
      password: password,
    }).populate("role", "name");

    if (!userFound) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı veya bilgiler geçersiz." });
    }

    const role = userFound.role ? userFound.role.name : null;

    console.log(role)
    if (userFound) {
      console.log(`Kullanıcı Doğrulandı`);
      const accessToken = jwt.sign(
        { id: userFound.id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1000s" }
      );

      const refreshToken = jwt.sign(
        { id: userFound.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "1500s" }
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

app.post("/admin/register", async (req, res) => {
  try {
    console.log(`geldi`)
    const { email, password } = req.body;

    const hasUser = await Usermodel.findOne({ email: email });

    if (hasUser) {
      return res.status(400).json("User already exists.");
    }
    const foundRole = await Rolemodel.findOne({ name: "admin" });

    const newUser = new Usermodel({
      email: email,
      password: password,
      role: foundRole._id,
    });

    const savedUser = await newUser.save();

    return res.status(200).json(savedUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
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
      { expiresIn: "1500s" }
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

