const express = require("express");
const app = express();
const httpServer = require("http").createServer(app); // Create HTTP server
const io = require("socket.io")(httpServer, {
  cors: {
    origin: process.env.BACK_END_URL,
    methods: ["GET", "POST"],
  },
});
const cors = require("cors");
const path = require("path");
const authMiddleware = require("./middlewares.js");
const swaggerRoute = require("./routers/swaggerRoute.js");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;

httpServer.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

require("dotenv").config();
require("./routers/rooterManager.js")(app, io); // Pass io instance to your routers

const userModel = require("./models/user");

app.get("/users", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const users = await userModel.find().populate("role", "name");
    const allUsers1 = await userModel.find({});
    const allUsers = allUsers1.filter((member) => member._id != userId);

    const usersWithRoleNames = users.map((user) => ({
      _id: user._id,
      email: user.email,
      role: user.role ? user.role.name : null,
    }));

    res.status(200).json({
      usersWithRoleNames: usersWithRoleNames,
      allUsers: allUsers,
      user: userId,
    });
  } catch (error) {
    res.status(500).json({ error: "Kullanıcılar getirilemedi" });
  }
});

const notificationModel = require("./models/notification.js");

app.get("/notifications", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await notificationModel.find({ userId });
    const unReadNotificationCount = await notificationModel.countDocuments({
      userId,
      read: false,
    });

    return res.status(200).json({ notifications, unReadNotificationCount });
  } catch (error) {
    console.error(error);
  }
});

app.delete("/notifications", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const notifications = await notificationModel.deleteMany({ userId });

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
  }
});

app.put("/notifications", async (req, res) => {
  try {
    const { notificationId } = req.body;

    if (notificationId === undefined) {
      const notifications = await notificationModel.updateMany({
        $set: { read: true },
      });
      return res.status(200).json({ notifications });
    }

    const notifications = await notificationModel.updateOne(
      { _id: notificationId },
      { teamName: req.body.teamName },
      { fullname: req.body.fullname },
      { type: req.body.type },
      { $set: { read: true } }
    );
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
