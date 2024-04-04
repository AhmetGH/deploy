const Topicmodel = require("../models/topic");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto-js");
const idDecoder = require("../iddecoder.js");

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
// function convertStringToData(dataString) {
//   const data = JSON.parse(dataString);

//   //console.log("data", data);
//   const getItem = (title, key, children = [], id = "") => ({
//     title,
//     key,
//     children,
//     id,
//   });

//   return data.map((item) => {
//     const { title, key, children, id } = item;
//     // console.log("id:", id);
//     // console.log("children:", children);
//     // console.log("key:", key);
//     // console.log("title:", title);
//     if (children && children.length > 0) {
//       children.forEach((id) => {
//         const childNode = data.find((item) => item._id == childId.toString());

//         if (childNode) {
//           const child = buildTree(childNode);
//           const jsonString2 = JSON.stringify(child.id);
//           const encodedid1 = btoa(jsonString2).toString("base64");
//           child.id = encodedid1;
//           newNode.children.push(child);
//         }
//       });
//     }
//     const convertedChildren = children.map((child) => {
//       const { title, key, children, id } = child;
//       // console.log("id:", id)
//       // console.log("children:", children)
//       // console.log("key:", key)
//       // console.log("title:", title)

//       //const convertedChild = getItem(title, key, children, id);
//       const csl = `getItem("${title}", "${key}",  ${JSON.stringify(
//         children
//       )}, "${id}")`;
//       //console.log("csl:", csl);

//       return csl;
//     });
//     const result = `getItem("${title}", "${key}",${JSON.stringify(
//       convertedChildren
//     )}, "${id}")`;
//     //console.log("1111111");
//     //console.log("aaaaaaaaaaaaaaaaaaaaaaa" + result);
//     return result;
//   });
// }

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

module.exports.getTopicById = async (req, res) => {
  const topicId = req.params.topicId;

  const decodedId = atob(topicId, "base64").toString("utf-8");
  const id = decodedId.replace(/^"(.*)"$/, "$1");
  try {
    const topic = await Topicmodel.findById(id).populate("post");
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
};

module.exports.getTopicTypeAsTreeData = async (req, res) => {
  const userId = req.user.id;
  console.log(userId);
  try {
    const allTopic = await Topicmodel.find({}).sort({ _id: -1 });
    const yourOwnTopics = await Topicmodel.find({ owner: userId });
    console.log(yourOwnTopics);

    const tree = convertToTree(allTopic);
    const treeData = JSON.stringify(tree, null, 2);
    
    const yourOwnTree=convertToTree(yourOwnTopics);
    const yourOwnTreeData=JSON.stringify(yourOwnTree, null, 2);

    //const dataArray = convertStringToData(treeData);
    //console.log("11");
    //console.log(dataArray.join(",\n"));

    res.json({ treeData: treeData, allTopic: allTopic,yourOwnTreeData:yourOwnTreeData,yourOwnTopics:yourOwnTopics });
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
    console.log(member);

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
