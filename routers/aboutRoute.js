var express = require("express");
var router = express.Router();
const authMiddleware = require("../middlewares");
var aboutController = require("../controllers/aboutController");

router.get("/", authMiddleware, aboutController.allAbouts);

router.post("/", authMiddleware, aboutController.createAbout);

router.get("/ispublic/:noteId", authMiddleware, aboutController.aboutIsPublic);

module.exports = router;
