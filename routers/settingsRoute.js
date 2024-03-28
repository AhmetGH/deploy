var express = require("express");
var router = express.Router();
var authMiddleware = require("../middlewares");
var settingsController = require("../controllers/settingsController");

router.get("/", authMiddleware, settingsController.userSettings);

router.put("/", authMiddleware, settingsController.updateUserSettings);

router.get("/profile", authMiddleware, settingsController.userProfile);

router.put("/profile", authMiddleware, settingsController.updateUserProfile);

module.exports = router;
