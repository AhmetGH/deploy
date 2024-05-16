const Topicmodel = require("../models/topic");
const NoteModel = require("../models/note.js");
const Usermodel = require("../models/user.js");
const TeamModel = require("../models/team.js");
const { v4: uuidv4 } = require("uuid");
const { Types: { ObjectId } } = require('mongoose');
const idDecoder = require("../iddecoder.js");

const { merge } = require("../routers/teamRoute.js");

const cache = require("../utils/cache.js");

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
  const myTeam = await TeamModel.find({ members: userId }).populate("members");
  myTopics = await Topicmodel.find({
    accessUser: userId.toString(),
  }).populate("accessUser");

  const promises = myTeam.map(async (item) => {
    teamId = item._id;
    const myTeamsTopic = await Topicmodel.find({
      accessTeam: teamId.toString(),
    }).populate("accessTeam");
    return myTeamsTopic;
  });
  const myTeamsTopic1 = await Promise.all(promises);

  // const myTeamsTopics = [];
  // const existingIds = [];

  // myTeamsTopic1.forEach((topics) => {
  //   topics.forEach((topic) => {
  //     if (!existingIds.includes(topic._id.toString())) {
  //       existingIds.push(topic._id.toString());
  //       myTeamsTopics.push(topic);
  //     }
  //   });
  // });

  const myTeamsTopics = getUniqueTopics(myTeamsTopic1);
  const yourOwnTopics = await Topicmodel.find({ owner: userId });

  const userTopic = await Usermodel.findById(userId).populate({
    path: "favoriteTopic",
  });

  const mergedTopics1 = [...myTopics, ...myTeamsTopics, ...yourOwnTopics];
  const mergedTopics = getUniqueTopics(mergedTopics1);
  function mergeTopics(mergedTopics, favoriteTopics) {
    const newTopics = [];

    mergedTopics.forEach((mergedTopic) => {
      favoriteTopics.forEach((favoriteTopic) => {
        if (mergedTopic._id.equals(favoriteTopic._id)) {
          newTopics.push(mergedTopic);
        }
      });
    });

    return newTopics;
  }
  const authorizedFavoriteTopics = mergeTopics(
    mergedTopics,
    userTopic.favoriteTopic
  );

  let sortedTopics = [];

  const underElementTrue = authorizedFavoriteTopics.filter(
    (topic) => topic.underElement
  );
  underElementTrue.sort((a, b) => b.children.length - a.children.length);
  sortedTopics = [...sortedTopics, ...underElementTrue];

  // UnderElement false olanları ve child sayısına göre sırala
  const underElementFalse = authorizedFavoriteTopics.filter(
    (topic) => !topic.underElement
  );
  underElementFalse.sort((a, b) => b.children.length - a.children.length);
  sortedTopics = [...sortedTopics, ...underElementFalse];

  // Her bir öğeden sadece bir tane olacak şekilde sıralı listeyi oluştur
  sortedTopics = sortedTopics.filter(
    (topic, index, self) => index === self.findIndex((t) => t._id === topic._id)
  );

  for (const item of sortedTopics) {
    item.underElement = true;
  }
  let result = [];

  async function getChildren(topic) {
    result.push(topic);
    for (const childId of topic.children) {
      const child = await Topicmodel.findById(childId);

      if (child) {
        if (
          mergedTopics.some(
            (mergedTopic) => mergedTopic._id.toString() === child._id.toString()
          )
        ) {
          await getChildren(child);
        }
      }
    }
  }

  for (const topic of sortedTopics) {
    await getChildren(topic);
  }
  return result;
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

    const favoritesWithChildren = await getFavoritesWithChildren(userId);
    const tree = convertToTree(favoritesWithChildren);

    const favoriteNotes = user.favoritePosts.map((note) => ({
      id: btoa(JSON.stringify(note._id)).toString("base64"),
      title: note.noteName,
      children: [],
      key: uuidv4(),
      type: "note",
    }));

    const mergedData = [...tree, ...favoriteNotes];

    return res.status(200).json({ favoriteTreeData: mergedData });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.createTopic = async (req, res, io) => {
  const owner = req.user.id;
  const {
    topicName,
    children,
    underElement,
    parent,
    accessTeam,
    accessUser,
    editTeam,
    editUser,
  } = req.body;

  try {
    const newTopic = new Topicmodel({
      topicName,
      owner,
      children,
      parent,
      underElement,
      accessTeam,
      accessUser,
      editTeam,
      editUser,
    });
    const savedTopic = await newTopic.save();
    io.emit("createTopic");

    res.status(201).json({ id: savedTopic._id });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.updateTopic = async (req, res, io) => {
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
    io.emit("updateTopic");

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
    return [years, years !== 1 ? "YearsAgo" : "YearAgo"];
  } else if (months > 0) {
    return [months, months !== 1 ? "MonthsAgo" : "MonthAgo"];
  } else if (days > 0) {
    return [days, days !== 1 ? "DaysAgo" : "DayAgo"];
  } else if (hours > 0) {
    return [hours, hours !== 1 ? "HoursAgo" : "HourAgo"];
  } else if (minutes > 0) {
    return [minutes, minutes !== 1 ? "MinutesAgo" : "MinuteAgo"];
  } else {
    return [seconds, seconds !== 1 ? "SecondsAgo" : "SecondAgo"];
  }
};
module.exports.mainTopicCheck = async (req, res) => {
  let underId = "";
  if (req.body.selectedId) {
    underId = req.body.selectedId;
  } else if (req.body.topicId) {
    underId = idDecoder(req.body.topicId);
  }

  try {
    const topic = await Topicmodel.findById(underId).populate("accessTeam");
    const owner = topic.owner.toString();
    const teamIds = await Promise.all(
      topic.accessTeam.map(async (team) => {
        const teamk = await TeamModel.findById(team);
        return {
          _id: teamk._id.toString(),
          teamName: teamk.teamName, // Use 'teamk' here instead of 'team'
        };
      })
    );

    const UserIds = await Promise.all(
      topic.accessUser.map(async (user) => {
        const userk = await Usermodel.findById(user);

        return {
          _id: userk._id.toString(),
          fullname: userk.fullname,
        };
      })
    );

    return res.json({
      userIds: UserIds,
      teamIds: teamIds,
    });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.getTopicById = async (req, res) => {
  const topicId = req.params.topicId;
  const decodedId = idDecoder(topicId);
  const userId = req.user.id;

  try {
    const [topic, user] = await Promise.all([
      Topicmodel.findById(decodedId).populate({
        path: "post",
        select: "id noteName operationDate accessTeam accessUser owner",
        options: { sort: { operationDate: -1 } },
      }),
      Usermodel.findById(userId).select("fullname"),
    ]);

    if (!topic) {
      return res.status(404).json({ message: "Konu bulunamadı" });
    }

    const teamIds = topic.accessTeam.map((team) => team.toString());

    const teamUsers = await TeamModel.find({ _id: { $in: teamIds } }, { members: 1 })
      .populate("members", "_id") // Üyelerin sadece _id alanlarını getirir
      .lean(); // Düz nesne olarak verileri alır

    const allUserIds = teamUsers.flatMap((team) =>
      team.members.map((member) => member._id.toString())
    );

    const userTeams = await TeamModel.find({ members: userId });
    const userTeamIds = userTeams.map((team) => team._id.toString());
    const accessIds = new Set([...userTeamIds, userId]);

    const posts = topic.post.map((post) => {
      const [operationTime, operationDate] = calculateTimeAgo(
        post.operationDate
      );
      return {
        id: post._id,
        noteName: post.noteName,
        noteId: btoa(JSON.stringify(post._id)).toString("base64"),
        operationTime,
        operationDate,
        accessTeam: post.accessTeam,
        accessUser: post.accessUser,
        owner: post.owner,
        canEdit: this.checkAccess(post, accessIds),
      };
    });

    const filteredPosts = posts.filter((post) => post.canEdit);
    const editTeams = topic.editTeam.map((team) => team.toString());
    let editPermission =
      editTeams.some((teamId) => userTeamIds.includes(teamId)) ||
      topic.editUser.includes(userId) ||
      topic.owner.toString() === userId;
      
    const userData = await this.getUniqueUserData([
      ...topic.accessUser,
      topic.owner,
      ...allUserIds,
    ]);
    res.json({
      fullname: user.fullname,
      posts: filteredPosts,
      mergedUsers: userData,
      edit: editPermission,
    });
  } catch (error) {
    console.error("Error fetching topic details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.checkAccess = (post, accessIds) => {
  return (
    post.accessTeam.some((team) => accessIds.has(team.toString())) ||
    post.accessUser.some((user) => accessIds.has(user.toString())) ||
    accessIds.has(post.owner.toString())
  );
};

module.exports.getUniqueUserData = async (userIds) => {
  const users = await Usermodel.find({ _id: { $in: userIds } });
  return users.map((user) => ({
    key: user._id.toString(),
    label: user.fullname,
    nick: user.fullname
      .split(" ")
      .map((name) => name.charAt(0).toUpperCase())
      .join(""),
  }));
};

const findTeamTopics = async (teamId) => {
  return Topicmodel.find({ accessTeam: teamId.toString() }).populate(
    "accessTeam"
  );
};

const getTeamTopics = async (userId) => {
  const cacheKey = `teamTopics-${userId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const myTeam = await TeamModel.find({ members: userId }).populate("members");
  const topics = await Promise.all(
    myTeam.map(async (team) => findTeamTopics(team._id))
  );

  cache.set(cacheKey, topics);
  return topics;
};

const getUniqueTopics = (topics) => {
  const uniqueTopics = [];
  const existingIds = new Set();

  topics.flat().forEach((topic) => {
    if (!existingIds.has(topic._id.toString())) {
      existingIds.add(topic._id.toString());
      uniqueTopics.push(topic);
    }
  });

  return uniqueTopics;
};

module.exports.getTopicTypeAsTreeData = async (req, res) => {
  const userId = req.user.id;
  try {
    const myTopics = await Topicmodel.find({
      accessUser: userId.toString(),
    }).populate("accessUser");
    const teamTopics = await getTeamTopics(userId);
    

    const yourOwnTopics = await Topicmodel.find({ owner: userId });
    const mergedTopics = [...myTopics, ...teamTopics , ...yourOwnTopics];
    const uniqueTopics = getUniqueTopics(mergedTopics);
    const treeData = JSON.stringify(convertToTree(uniqueTopics), null, 2);
    const yourOwnTreeData = JSON.stringify(
      convertToTree(yourOwnTopics),
      null,
      2
    );

    res.json({ treeData, yourOwnTreeData });
  } catch (error) {
    console.error("Failed to fetch topics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports.getTopic = async (req, res) => {
  const userId = req.user.id;
  try {
    const myTeam = await TeamModel.find({ members: userId }).populate(
      "members"
    );
    myTopics = await Topicmodel.find({
      editUser: userId.toString(),
    }).populate("editUser");

    const promises = myTeam.map(async (item) => {
      teamId = item._id;
      const myTeamsTopic = await Topicmodel.find({
        editTeam: teamId.toString(),
      }).populate("editTeam");
      return myTeamsTopic;
    });
    const myTeamsTopic1 = await Promise.all(promises);

    //const myTeamsTopics = myTeamsTopic1.flat();
    const myTeamsTopics = [];
    const existingIds = [];

    myTeamsTopic1.forEach((topics) => {
      topics.forEach((topic) => {
        if (!existingIds.includes(topic._id.toString())) {
          existingIds.push(topic._id.toString());
          myTeamsTopics.push(topic);
        }
      });
    });

    const yourOwnTopics = await Topicmodel.find({ owner: userId });
    const mergedTopics = [...myTopics, ...myTeamsTopics, ...yourOwnTopics];
    const merged=getUniqueTopics(mergedTopics)
    //const editAuth=[...mergedTopics, ...yourOwnTopics];

    res.json({
      myTeamsTopics: merged,
      yourOwnTopics: yourOwnTopics,
    });

    // const allTopic = await Topicmodel.find({}).sort({ _id: -1 });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.getTopicByIdEdit = async (req, res) => {
  const topicId = req.params.topicId;

  const id = idDecoder(topicId);
  const userId = req.user.id;
  try {
    const topicOwner = await Topicmodel.findById(id, "owner");

    const topic = await Topicmodel.findById(id).populate({
      path: "post",
      select: "id noteName operationDate accessTeam accessUser owner",
      options: { sort: { operationDate: -1 } },
    });

    const topicsWithEditTeam = topic.editTeam.includes(userId);

    const topicsWithEditUser = topic.editUser.includes(userId);

    let edit = false;
    if (
      topicsWithEditUser ||
      topicsWithEditTeam ||
      userId === topicOwner.owner.toString()
    ) {
      edit = true;
    }

    return res.json({ edit });
  } catch (error) {
    return res.status(400).json(error);
  }
};
module.exports.AddFavoriteTopic = async (req, res, io) => {
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
    io.emit("addFavoriteTopic");
    return res.status(200).json({ message: "Note added to favorites" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
module.exports.UnFavoriteTopic = async (req, res, io) => {
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
    io.emit("unFavoriteTopic");
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

module.exports.updateTopicsChildren = async (req, res, io) => {
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

    io.emit("updateTopicChildren");

    res.status(200).json({ message: "Successfully updated topic's children" });
  } catch (error) {
    console.error("Error updating topics children:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.deleteTopicById = async (req, res, io) => {
  const { topicId } = req.params;
  const decodedTopicId = idDecoder(topicId);

  try {
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
    if (isHaveChildren1.length > 0 && isHaveChildren.underElement) {
      isHaveChildren1.map(async (item) => {
        const topic = await Topicmodel.findById(item);

        if (topic) {
          topic.parent = null;
          topic.underElement = true;
          await topic.save();
        }
      });

      deleted = await Topicmodel.findByIdAndDelete(decodedTopicId);
    } else if (isHaveChildren1.length == 0 && isHaveChildren.underElement) {
      deleted = await Topicmodel.findByIdAndDelete(decodedTopicId);
    } else if (!isHaveChildren.underElement && isHaveChildren1.length > 0) {
      isHaveMomy.children.push(isHaveChildren1);
      isHaveChildren1.map(async (child) => {
        const c = await Topicmodel.findById(child);
        c.parent = isHaveMomy._id;
        await c.save();
      });

      updatedMomy = await isHaveMomy.save();
      await Topicmodel.updateOne(
        { _id: isHaveMomy._id }, // Ana belgenin _id değeri
        { $pull: { children: { $in: [decodedTopicId] } } }
      );
      deleted = await Topicmodel.findByIdAndDelete(decodedTopicId);
    } else {
      await Topicmodel.updateOne(
        { _id: isHaveMomy._id }, // Ana belgenin _id değeri
        { $pull: { children: { $in: [decodedTopicId] } } }
      );
      deleted = await Topicmodel.findByIdAndDelete(decodedTopicId);
    }

    if (!deleted) {
      return res
        .status(404)
        .json({ error: "Silinmek istenen öğe bulunamadı." });
    }
    io.emit("deleteTopic");
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
