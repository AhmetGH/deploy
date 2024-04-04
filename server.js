const express = require("express");
var jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const authMiddleware = require("./middlewares.js");
const swaggerRoute = require("./routers/swaggerRoute.js");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;

require("dotenv").config();

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
app.use("/api-docs", swaggerRoute);

require("./routers/rooterManager.js")(app);

const userModel = require("./models/user");

app.get("/users", async (req, res) => {
  try {
    const users = await userModel.find().populate("role", "name");
    const allUsers = await userModel.find({});
    // console.log(a)
    const usersWithRoleNames = users.map((user) => ({
      email: user.email,
      role: user.role ? user.role.name : null,
    }));
    console.log(usersWithRoleNames);

    res
      .status(200)
      .json({ usersWithRoleNames: usersWithRoleNames, allUsers: allUsers });
  } catch (error) {
    console.error("Kullanıcılar getirme hatası:", error);
    res.status(500).json({ error: "Kullanıcılar getirilemedi" });
  }
});
