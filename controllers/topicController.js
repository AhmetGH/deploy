const Topicmodel = require("../models/topic");
const NoteModel = require("../models/note.js");
const Usermodel = require("../models/user.js");
const TeamModel = require("../models/team.js");
const { v4: uuidv4 } = require("uuid");

const idDecoder = require("../iddecoder.js");
const Topic = require("../models/topic");
const { merge } = require("../routers/teamRoute.js");

function convertToTree(data) {
  const tree = [];

  const buildTree = (node) => {
    const newNode = {
      title: node.topicName,
      key: uuidv4(),
      children: [],
      id: node._id,
      type: "topic",
      under: node.underElement,
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
        under: node.underElement,
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

// async function populateChildren(topicId) {
//   const topicc = await Topicmodel.findById(topicId);
//   if (!topicc) {
//     return null;
//   }
//   try {
//     await topicc.populate("children");
//   } catch (error) {
//     console.error("Populate Error:", error);
//   }

//   const populatedTopic = topicc.toJSON();
//   console.log("populatedTopic:", populatedTopic);
//   populatedTopic.children = await Promise.all(
//     populatedTopic.children.map((child) => populateChildren(child._id))
//   );

//   return populatedTopic;
// }
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
async function getFavoritesWithChildren(userId) {
  const userTopic = await Usermodel.findById(userId).populate({
    path: "favoriteTopic",
  });

  for (const item of userTopic.favoriteTopic) {
    item.underElement = true;
  }

  let result = [];

  async function getChildren(topic) {
    result.push(topic);
    for (const childId of topic.children) {
      const child = await Topicmodel.findById(childId);
      if (child) {
        await getChildren(child);
      }
    }
  }

  for (const topic of userTopic.favoriteTopic) {
    await getChildren(topic);
  }

  return result;
}
module.exports.getFavoritesByUserId = async (req, res) => {
  const userId = req.user.id;

  try {
    const favoritesWithChildren = await getFavoritesWithChildren(userId);
    const tree = convertToTree(favoritesWithChildren);
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
    const mergedData = [...tree, ...favoriteNotes];
    const favoriteTreeData = mergedData;

    return res.status(200).json({ favoriteTreeData });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.createTopic = async (req, res) => {
  const owner = req.user.id;
  const { topicName, children, underElement, parent, accessTeam, accessUser } =
    req.body;
  console.log("parent", parent);
  try {
    const newTopic = new Topicmodel({
      topicName,
      owner,
      children,
      parent,
      underElement,
      accessTeam,
      accessUser,
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
  console.log("eeeeeeeeeeeee", topicId);
  const id = idDecoder(topicId);
  console.log("id", id);
  try {
    const topic = await Topicmodel.findById(id).populate({
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
    //console.log(posts);
    return res.json({ fullname: user.fullname, posts: posts });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.getTopicTypeAsTreeData = async (req, res) => {
  const userId = req.user.id;
  try {
    const myTeam = await TeamModel.find({ members: userId }).populate(
      "members"
    );
    myTopics = await Topicmodel.find({
      accessUser: userId.toString(),
    }).populate("accessUser");

    //console.log(myTopics);
    const promises = myTeam.map(async (item) => {
      teamId = item._id;
      const myTeamsTopic = await Topicmodel.find({
        accessTeam: teamId.toString(),
      }).populate("accessTeam");
      return myTeamsTopic;
    });
    const myTeamsTopic1 = await Promise.all(promises);

    const myTeamsTopics = myTeamsTopic1.flat();
    //console.log(myTeamsTopics);

    const yourOwnTopics = await Topicmodel.find({ owner: userId });
    const mergedTopics = [...myTopics, ...myTeamsTopics];

    const tree = convertToTree(mergedTopics);
    const treeData = JSON.stringify(tree, null, 2);

    const yourOwnTree = convertToTree(yourOwnTopics);
    const yourOwnTreeData = JSON.stringify(yourOwnTree, null, 2);

    res.json({
      treeData: treeData,

      yourOwnTreeData: yourOwnTreeData,
    });

    // const allTopic = await Topicmodel.find({}).sort({ _id: -1 });
  } catch (error) {
    return res.status(400).json(error);
  }
};
module.exports.getTopic = async (req, res) => {
  const userId = req.user.id;
  try {
    const myTeam = await TeamModel.find({ members: userId }).populate(
      "members"
    );
    myTopics = await Topicmodel.find({
      accessUser: userId.toString(),
    }).populate("accessUser");

    //console.log(myTopics);
    const promises = myTeam.map(async (item) => {
      teamId = item._id;
      const myTeamsTopic = await Topicmodel.find({
        accessTeam: teamId.toString(),
      }).populate("accessTeam");
      return myTeamsTopic;
    });
    const myTeamsTopic1 = await Promise.all(promises);

    const myTeamsTopics = myTeamsTopic1.flat();
    //console.log(myTeamsTopics);

    const yourOwnTopics = await Topicmodel.find({ owner: userId });
    const mergedTopics = [...myTopics, ...myTeamsTopics];
    res.json({
      myTeamsTopics: mergedTopics,
      yourOwnTopics: yourOwnTopics,
    });

    // const allTopic = await Topicmodel.find({}).sort({ _id: -1 });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.AddFavoriteTopic = async (req, res) => {
  const userId = req.user.id;
  const topicId = idDecoder(req.body.topicId);
  try {
    const user = await Usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.favoriteTopic.includes(topicId)) {
      return res.status(400).json({ error: "Topic already in favorites" });
    }
    user.favoriteTopic.push(topicId);
    await user.save();
    return res.status(200).json({ message: "Note added to favorites" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
module.exports.UnFavoriteTopic = async (req, res) => {
  const userId = req.user.id;
  const topicId = idDecoder(req.params.topicId);
  try {
    const user = await Usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const updatedFavoriteTopics = user.favoriteTopic.filter(
      (topic) => topic.toString() !== topicId.toString()
    );
    user.favoriteTopic = updatedFavoriteTopics;
    await user.save();
    return res.status(200).json({ message: "Note removed to favorites" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports.getTopicByIdWithSubTopic = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await Usermodel.findById(userId).populate("favoriteTopic");

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
  const childrenId = req.params.childrenId;
  try {
    const topic = await Topicmodel.findById(topicId);
    const children = await Topicmodel.findById(childrenId);

    if (!topic || !children) {
      return res.status(404).json({ message: "Topic or Children not found" });
    }

    topic.children.push(children._id);
    children.parent = topic._id;

    await Promise.all([topic.save(), children.save()]);

    res.status(200).json({ message: "Successfully updated topic's children" });
  } catch (error) {
    console.error("Error updating topics children:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.deleteTopicById = async (req, res) => {
  const { topicId } = req.params;
  const decodedTopicId = idDecoder(topicId);

  try {
    //const deleted = await Topicmodel.findByIdAndDelete(topicId);
    const isHaveChildren = await Topicmodel.findById(decodedTopicId);
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
        console.log("topic delete:", topic);
        if (topic) {
          topic.parent = null;
          topic.underElement = true;
          await topic.save();
        }
      });

      deleted = await Topicmodel.findByIdAndDelete(decodedTopicId);
    } else {
      isHaveMomy.children.push(isHaveChildren1);
      isHaveChildren1.map(async (child) => {
        const c = await Topicmodel.findById(child);
        c.parent = isHaveMomy._id;
        await c.save();
      });

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

module.exports.getTopicAncestor = async (topicId) => {
  const ancestors = [];
  let currentTopic = await Topicmodel.findById(topicId);

  while (currentTopic && currentTopic.parent) {
    currentTopic = await Topicmodel.findById(currentTopic.parent);
    if (currentTopic) {
      ancestors.push(currentTopic);
    }
  }

  return ancestors;
};
