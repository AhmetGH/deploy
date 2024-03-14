var express = require("express")
var router = express.Router()
const Topicmodel = require('../models/topic')
const { v4: uuidv4 } = require('uuid');


const authMiddleware = require('../middlewares');


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
            node.children.forEach(childId => {
                const childNode = data.find(item => item._id == childId.toString());

                if (childNode) {
                    const child = buildTree(childNode);
                    newNode.children.push(child);
                }
            });
        }

        return newNode;
    }

    data.forEach(item => {
        if (item.underElement) {
            const node = buildTree(item);
            tree.push(node);
        }
    });

    return tree;
}



router.post('/', authMiddleware, async (req, res) => {
    console.log(req.body)
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


router.put('/', authMiddleware, async (req, res) => {
    const { topicId, noteId } = req.body;

    try {
        const topic = await Topicmodel.findById(topicId);

        if (!topic) {
            return res.status(404).json({ message: 'Konu bulunamadı' });
        }

        topic.post.push(noteId);

        await topic.save();

        res.status(200).json({ message: 'Not başarıyla eklendi' });
    } catch (error) {
        console.error('Not eklenirken bir hata oluştu:', error);
        return res.status(500).json({ message: 'Not eklenirken bir hata oluştu' });
    }
});

router.get("/:topicId", authMiddleware, async (req, res) => {
    const topicId = req.params.topicId;
    try {
        const topic = await Topicmodel.findById(topicId).populate('post');
        if (!topic) {
            return res.status(404).json({ message: 'Konu bulunamadı' });
        }
        const posts = topic.post.map(post => ({ noteName: post.noteName, noteId: post._id }));
        return res.json({ posts });
    } catch (error) {
        return res.status(400).json(error);
    }
});


router.get("/", async (req, res) => {
    try {
        const allTopic = await Topicmodel.find({}).sort({ _id: -1 });
        const tree = convertToTree(allTopic);

        const treeData = JSON.stringify(tree, null, 2)
        res.json({ treeData: treeData, allTopic: allTopic })
    } catch (error) {
        return res.status(400).json(error);
    }
})
router.get("/:id", authMiddleware, async (req, res) => {
    const topic = req.params.id;
    try {

        // const parent = await Topicmodel.findById(topic);
        // console.log("parent : ", parent, parent.topicName)

        // const childrenIds = parent.children.map(child => child.toString())
        // console.log("children : ", childrenIds)

        // console.log(childrenIds[0])

        // const parent2 = await Topicmodel.findById(childrenIds[2]);

        // console.log(parent2)


        const topicChildren = await Topicmodel.findOne({ _id: topic }).populate("children")
        // console.log(topicChildren)
        // const childrenCount = topicChildren.children.length;
        // // Popülasyon işlemini çocuk sayısı kadar döngü içinde gerçekleştirin
        // for (let i = 0; i < childrenCount; i++) {
        //     console.log("bieşr")

        //     await topicChildren.populate('children')

        // }
        console.log(topicChildren)
        res.json({ topicChildren })
    } catch (error) {
        return res.status(400).json(error);
    }


})


router.get('/owntopic', async (req, res) => {
    console.log("girdm")
    console.log(req.user.id)
    const userId = req.user.id;
    try {
        const member = await Topicmodel.find({ owner: userId }).populate('topicName');
        console.log("ownerrr" + member)
        res.json({ member })
    } catch (error) {
        return res.status(400).json(error);
    }
})


router.put('/:topicId/:childrenId/', authMiddleware, async (req, res) => {
    const topicId = req.params.topicId;
    console.log("topicid" + topicId)
    const childrenid = req.params.childrenId
    console.log("childe" + childrenid)

    try {
        const topics = await Topicmodel.findById({ _id: topicId })
        const children = await Topicmodel.findById({ _id: childrenid })
        console.log(topics)
        console.log(children)
        // Topic belgesine children belgesini ekle
        topics.children.push(children._id);
        const updatedTopic = await topics.save();


        if (!updatedTopic) {
            return res.status(404).json({ message: 'Üye bulunamadı' });
        }

        res.status(200).json({ message: 'Üye başarıyla güncellendi', updatedTopic });
    } catch (error) {
        res.status(500).json({ message: 'Üye güncellenirken bir hata oluştu', error: error.message });
    }
});
module.exports = router