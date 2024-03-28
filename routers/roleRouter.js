var express = require("express");
var router = express.Router();
var roleController = require("../controllers/roleController");

router.post("/", roleController.createRole);

router.get("/", roleController.allRoles);

module.exports = router;
