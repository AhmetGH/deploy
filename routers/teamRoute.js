var express = require("express");
var router = express.Router();
var teamController = require("../controllers/teamController");
const authMiddleware = require("../middlewares");

module.exports = function (io) {
  // io örneğini parametre olarak kabul et
  router.get("/allMembers/:teamName", teamController.allMembers);
  router.get("/teamNames", teamController.getTeamNames);
  router.get(
    "/teamMates/:teamName",
    authMiddleware,
    teamController.getTeamMembers
  );
  router.get("/", authMiddleware, teamController.getTeams);
  router.post(
    "/teamsOnlyMembers",
    authMiddleware,
    teamController.setTeamOnlyMembers
  );
  router.post("/", (req, res) => {
    teamController.createTeam(req, res, io);
  });
  router.put("/teamMates/:teamName", (req, res) => {
    teamController.updateTeamMember(req, res, io);
  });
  router.delete("/teamMates/:teamName", (req, res) => {
    teamController.removeTeamMember(req, res, io);
  });
  router.post("/teamMates/:teamName", authMiddleware, (req, res) => {
    teamController.createTeamMember(req, res, io);
  });
  router.put("/", (req, res) => {
    teamController.updateTeam(req, res, io);
  });
  router.delete("/", (req, res) => {
    teamController.deleteTeams(req, res, io);
  });

  return router;
};
