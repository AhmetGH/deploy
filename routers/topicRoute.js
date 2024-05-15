var express = require("express");
var router = express.Router();
const authMiddleware = require("../middlewares");
const topicController = require("../controllers/topicController");
const idDecoder = require("../iddecoder");

module.exports = function (io) {
  router.get(
    "/:topicName/:topicId",
    authMiddleware,
    topicController.getTopicById
  );

  router.get(
    "/edit/topicEdit/:topicId",
    authMiddleware,
    topicController.getTopicByIdEdit
  );

  router.get("/", authMiddleware, topicController.getTopicTypeAsTreeData);
  router.post("/", authMiddleware, (req, res) => {
    topicController.createTopic(req, res, io);
  });

  router.post("/main/kontrol", topicController.mainTopicCheck);
  router.put("/", authMiddleware, (req, res) => {
    topicController.updateTopic(req, res, io);
  });

  router.get(
    "/favorites",
    authMiddleware,
    topicController.getFavoritesByUserId
  );
  router.post("/favorites", authMiddleware, (req, res) => {
    topicController.AddFavoriteTopic(req, res, io);
  });
  router.delete("/favorites/:topicId", authMiddleware, (req, res) => {
    topicController.UnFavoriteTopic(req, res, io);
  });

  router.get("/topics//alltopics", authMiddleware, topicController.getTopic);

  router.get("/:id", authMiddleware, topicController.getTopicByIdWithChildren);

  router.get("/owntopic", topicController.getUsersTopic);

  router.put("/:topicId/:childrenId/", authMiddleware, (req, res) => {
    topicController.updateTopicsChildren(req, res, io);
  });

  router.delete("/:topicId", (req, res) => {
    topicController.deleteTopicById(req, res, io);
  });

  router.get("/:id//ancestors", async (req, res) => {
    try {
     

      const topicId = req.params.id;
      const decodedTopicId = idDecoder(topicId);

      const ancestors = await topicController.getTopicAncestor(decodedTopicId);

      res.json(ancestors);
    } catch (error) {
      console.error("Error fetching ancestors:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  return router;
};
