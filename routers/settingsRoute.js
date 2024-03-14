var express = require("express")
var router = express.Router()
const Usermodel = require("../models/user")
var authMiddleware = require("../middlewares")
var settingsController = require("../controllers/settingsController")

router.get("/", authMiddleware , settingsController.getSettings)

router.put("/", authMiddleware, settingsController.putSettings)

router.get("/profile", authMiddleware, settingsController.getProfile)

router.put("/profile", authMiddleware, settingsController.putProfile)

module.exports = router;
