var express = require("express");
var router = express.Router();
const authMiddleware = require("../middlewares");
const topicController = require("../controllers/topicController")


router.post("/", authMiddleware, topicController.createTopic)

router.put("/", authMiddleware,topicController.updateTopic)

router.get("/:topicId", authMiddleware, topicController.getTopicById)

router.get("/",authMiddleware, topicController.getTopicTypeAsTreeData)

router.get("/:id", authMiddleware, topicController.getTopicByIdWithChildren)

router.get("/owntopic", topicController.getUsersTopic)

router.put("/:topicId/:childrenId/", authMiddleware, topicController.updateTopicsChildren)
module.exports = router;
