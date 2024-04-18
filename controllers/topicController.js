const Topicmodel = require("../models/topic");
const NoteModel = require("../models/note.js");
const Usermodel = require("../models/user.js");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto-js");
const idDecoder = require("../iddecoder.js");
const Topic = require("../models/topic");

function convertToTree(data) {
  const tree = [];

  const buildTree = (node) => {
    const newNode = {
      title: node.topicName,
      key: uuidv4(),
      children: [],
      id: node._id,
      type: "topic",
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
    } else {
      const newNodeWithoutChildren = {
        title: node.topicName,
        key: uuidv4(),
        id: node._id,
      };
      return newNodeWithoutChildren;
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

module.exports.getFavoritesByUserId = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await Usermodel.findById(userId)
      .populate({
        path: "favoritePosts",
        select: "id noteName",
        options: { sort: { operationDate: -1 } },
      })
      .select("favoritePosts");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const favoriteNotes = user.favoritePosts.map((note) => ({
      id: btoa(JSON.stringify(note._id)).toString("base64"),
      title: note.noteName,
      children: [],
      key: uuidv4(),
      type: "note",
    }));

    return res.status(200).json({ favoriteNotes });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.createTopic = async (req, res) => {
  const owner = req.user.id;
  const { topicName, children, underElement } = req.body;

  try {
    const newTopic = new Topicmodel({
      topicName,
      owner,
      children,
      underElement,
    });
    const savedTopic = await newTopic.save();

    res.status(201).json({ id: savedTopic._id });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.updateTopic = async (req, res) => {
  const { topicId, noteId } = req.body;
  const decodedTopicId = idDecoder(topicId);
  const decodednoteId = idDecoder(noteId);

  try {
    const topic = await Topicmodel.findById(decodedTopicId);

    if (!topic) {
      return res.status(404).json({ message: "Konu bulunamadı" });
    }

    topic.post.push(decodednoteId);

    await topic.save();

    res.status(200).json({ message: "Not başarıyla eklendi" });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const calculateTimeAgo = (date) => {
  const currentDate = new Date();
  const diffInMs = currentDate - date;

  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) {
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  } else if (months > 0) {
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  } else if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else {
    return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  }
};

module.exports.getTopicById = async (req, res) => {
  const topicId = req.params.topicId;
  try {
    const topic = await Topicmodel.findById(idDecoder(topicId)).populate({
      path: "post",
      select: "id noteName operationDate",
      options: { sort: { operationDate: -1 } },
    });

    const user = await Usermodel.findById(req.user.id).select("fullname");
    if (!topic) {
      return res.status(404).json({ message: "Konu bulunamadı" });
    }
    const posts = topic.post.map((post) => ({
      noteName: post.noteName,
      noteId: btoa(JSON.stringify(post._id)).toString("base64"),
      operationDate: calculateTimeAgo(post.operationDate),
    }));

    return res.json({ fullname: user.fullname, posts });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.getTopicTypeAsTreeData = async (req, res) => {
  const userId = req.user.id;
  try {
    const allTopic = await Topicmodel.find({}).sort({ _id: -1 });
    const yourOwnTopics = await Topicmodel.find({ owner: userId });

    const tree = convertToTree(allTopic);
    const treeData = JSON.stringify(tree, null, 2);

    const yourOwnTree = convertToTree(yourOwnTopics);
    const yourOwnTreeData = JSON.stringify(yourOwnTree, null, 2);

    res.json({
      treeData: treeData,
      allTopic: allTopic,
      yourOwnTreeData: yourOwnTreeData,
      yourOwnTopics: yourOwnTopics,
    });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.AddFavoriteTopicAndNotes = async (req, res) => {
  const userId = req.user.id;
  try {
    const allTopic = await Topicmodel.find({}).sort({ _id: -1 });
    const yourOwnTopics = await Topicmodel.find({ owner: userId });

    const tree = convertToTree(allTopic);
    const treeData = JSON.stringify(tree, null, 2);

    const yourOwnTree = convertToTree(yourOwnTopics);
    const yourOwnTreeData = JSON.stringify(yourOwnTree, null, 2);

    res.json({
      treeData: treeData,
      allTopic: allTopic,
      yourOwnTreeData: yourOwnTreeData,
      yourOwnTopics: yourOwnTopics,
    });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.getTopicByIdWithChildren = async (req, res) => {
  const topic = req.params.id;
  try {
    const topicChildren = await Topicmodel.findOne({ _id: topic }).populate(
      "children"
    );

    res.json({ topicChildren });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.getUsersTopic = async (req, res) => {
  const userId = req.user._id;
  try {
    const member = await Topicmodel.find({ owner: userId }).populate(
      "topicName"
    );

    res.json({ member });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.updateTopicsChildren = async (req, res) => {
  const topicId = req.params.topicId;
  const childrenid = req.params.childrenId;

  try {
    const topics = await Topicmodel.findById({ _id: topicId });
    const children = await Topicmodel.findById({ _id: childrenid });

    topics.children.push(children._id);
    const updatedTopic = await topics.save();

    if (!updatedTopic) {
      return res.status(404).json({ message: "Üye bulunamadı" });
    }

    res
      .status(200)
      .json({ message: "Üye başarıyla güncellendi", updatedTopic });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.deleteTopicById = async (req, res) => {
  const { topicId } = req.params;
  const decodedTopicId = idDecoder(topicId);

  try {
    //const deleted = await Topicmodel.findByIdAndDelete(topicId);
    const isHaveChildren = await Topicmodel.findById(decodedTopicId);
    console.log(isHaveChildren);
    if (isHaveChildren.post) {
      const posts = isHaveChildren.post;

      if (posts && posts.length > 0) {
        posts.map(async (item) => {
          await NoteModel.findByIdAndDelete(item);
        });
      }
    }

    const isHaveChildren1 = isHaveChildren.children;
    const isHaveMomy = await Topicmodel.findOne({
      children: decodedTopicId.toString(),
    }).populate("children");
    let updatedMomy = "";
    let deleted = null;
    if (isHaveChildren1 && isHaveChildren.underElement) {
      isHaveChildren1.map(async (item) => {
        const topic = await Topicmodel.findById(item);
        topic.underElement = true;
        await topic.save();
      });

      deleted = await Topicmodel.findByIdAndDelete(decodedTopicId);
    } else {
      isHaveMomy.children.push(isHaveChildren1);
      updatedMomy = await isHaveMomy.save();
      deleted = await Topicmodel.findByIdAndDelete(decodedTopicId);
    }

    if (!deleted) {
      return res
        .status(404)
        .json({ error: "Silinmek istenen öğe bulunamadı." });
    }

    res.json({ message: "Öğe başarıyla silindi.", deleted });
  } catch (err) {
    console.error("Silme işlemi hatası:", err);
    res.status(500).json({ error: "Bir hata oluştu, öğe silinemedi." });
  }
};
