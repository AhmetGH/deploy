var express = require("express")
var router = express.Router()
var roleController = require("../controllers/roleController")


router.post("/", roleController.postRole )
  

router.get('/', roleController.getRoles)

module.exports = router
  