var express = require("express");
var router = express.Router();
var teamController = require("../controllers/teamController")


router.get("/:teamName", teamController.getTeamMates)

router.get("/", teamController.getTeams)

router.post("/", teamController.postTeam)

router.post("/:teamName/member", teamController.postTeamMember)

router.put('/:teamName/member/:id', teamController.putMember)

  module.exports = router

