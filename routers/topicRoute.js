var express = require("express");
var router = express.Router();
const Topicmodel = require("../models/topic");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto-js");

const authMiddleware = require("../middlewares");
//const hashed=require('../hash')

function convertToTree(data) {
  const tree = [];

  const buildTree = (node) => {
    const newNode = {
      title: node.topicName,
      key: uuidv4(),
      children: [],
      id: node._id,
    };

    if (node.children && node.children.length > 0) {
      node.children.forEach((childId) => {
        const childNode = data.find((item) => item._id == childId.toString());

        if (childNode) {
          const child = buildTree(childNode);
          const jsonString2 = JSON.stringify(child.id);
          const encodedid1 = btoa(jsonString2).toString("base64");
          child.id = encodedid1;
          newNode.children.push(child);
        }
      });
    }

    return newNode;
  };

  data.forEach((item) => {
    if (item.underElement) {
   
      const jsonString1 = JSON.stringify(item._id);
      const encodedid = btoa(jsonString1).toString("base64");
      const node = buildTree(item);
      node.id = encodedid;
      tree.push(node);
    }
  });

  return tree;
}

router.post("/", authMiddleware, async (req, res) => {
  console.log(req.body);
  const owner = req.user.id;
  const { topicName, access, edit, children, underElement } = req.body;
  try {
    const newTopic = new Topicmodel({
      topicName,
      access,
      edit,
      owner,
      children,
      underElement,
    });
    const savedTopic = await newTopic.save();

    res.status(201).json({ id: savedTopic._id });
  } catch (error) {
    console.error("Not kaydedilemedi", error);
    res.status(500).json({ message: "Not kaydedilemedi" });
  }
});

router.put("/", authMiddleware, async (req, res) => {
  const { topicId, noteId } = req.body;

  try {
    const topic = await Topicmodel.findById(topicId);

    if (!topic) {
      return res.status(404).json({ message: "Konu bulunamadı" });
    }

    topic.post.push(noteId);

    await topic.save();

    res.status(200).json({ message: "Not başarıyla eklendi" });
  } catch (error) {
    console.error("Not eklenirken bir hata oluştu:", error);
    return res.status(500).json({ message: "Not eklenirken bir hata oluştu" });
  }
});

router.get("/:topicId", authMiddleware, async (req, res) => {
  const topicId = req.params.topicId;
  const decodedId = atob(topicId, "base64").toString("utf-8");
  const id = decodedId.replace(/^"(.*)"$/, "$1");
  console.log(id);

  try {
    const topic = await Topicmodel.findById(id).populate("post");
    console.log(topic);
    if (!topic) {
      return res.status(404).json({ message: "Konu bulunamadı" });
    }
    const posts = topic.post.map((post) => {
      const jsonString = JSON.stringify(post._id);
      const noteId = btoa(jsonString).toString("base64");

      return {
        noteName: post.noteName,
        noteId: noteId,
      };
    });
    return res.json({ posts });
  } catch (error) {
    return res.status(400).json(error);
  }
});

router.get("/", async (req, res) => {
  try {
    const allTopic = await Topicmodel.find({}).sort({ _id: -1 });

    const tree = convertToTree(allTopic);

    const treeData = JSON.stringify(tree, null, 2);
    res.json({ treeData: treeData, allTopic: allTopic });
  } catch (error) {
    return res.status(400).json(error);
  }
});
router.get("/:id", authMiddleware, async (req, res) => {
  const topic = req.params.id;
  try {
    const topicChildren = await Topicmodel.findOne({ _id: topic }).populate(
      "children"
    );

    console.log(topicChildren);
    res.json({ topicChildren });
  } catch (error) {
    return res.status(400).json(error);
  }
});

router.get("/owntopic", async (req, res) => {
  const userId = req.user.id;
  try {
    const member = await Topicmodel.find({ owner: userId }).populate(
      "topicName"
    );
    console.log("ownerrr" + member);
    res.json({ member });
  } catch (error) {
    return res.status(400).json(error);
  }
});

router.put("/:topicId/:childrenId/", authMiddleware, async (req, res) => {
  const topicId = req.params.topicId;
  const childrenid = req.params.childrenId;

  try {
    const topics = await Topicmodel.findById({ _id: topicId });
    const children = await Topicmodel.findById({ _id: childrenid });
    // Topic belgesine children belgesini ekle
    topics.children.push(children._id);
    const updatedTopic = await topics.save();

    if (!updatedTopic) {
      return res.status(404).json({ message: "Üye bulunamadı" });
    }

    res
      .status(200)
      .json({ message: "Üye başarıyla güncellendi", updatedTopic });
  } catch (error) {
    res.status(500).json({
      message: "Üye güncellenirken bir hata oluştu",
      error: error.message,
    });
  }
});
module.exports = router;
