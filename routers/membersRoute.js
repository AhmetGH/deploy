var express = require("express")
var membersController = require("../controllers/membersController")
var router = express.Router()
//const Usermodel = require('../models/user')


router.put('/:id', membersController.members)

module.exports = router