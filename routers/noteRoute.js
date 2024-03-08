var express = require("express")
var router = express.Router()
//var noteController = require("../controllers/noteController")
const Notemodel = require('../models/note')
const Usermodel = require("../models/user")

const authMiddleware = require('../middlewares');


router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    //console.log(userId)
    const member = await Notemodel.find({ members: userId }).populate('noteName');
    //console.log(member)
    const allnotes = await Notemodel.find({}).sort({ _id: -1 });
    //const publicnotes = await Notemodel.find({ isPublic: true }).sort({ _id: -1 });
    res.json({ allnotes: allnotes, member: member })
  } catch (error) {
    return res.status(400).json(error);
  }
})


router.get("/quill", authMiddleware, async (req, res) => {
  try {
    const allnotes = await Notemodel.find({}).sort({ _id: -1 });
    res.status(200).json({ allnotes })
  } catch (error) {
    return res.status(400).json(error);
  }
})

router.get("/quill/:noteName", authMiddleware, async (req, res) => {
  const noteName = req.params.noteName;
  //console.log(req.params.noteName)
  try {
    const not = await Notemodel.findOne({ noteName });
    //console.log(not)
    res.status(200).json({ not })
  } catch (error) {
    return res.status(400).json(error);
  }
})



router.get("/main", async (req, res) => {
  try {
    const publicnotes = await Notemodel.find({ isPublic: true }).sort({ _id: -1 });
    //console.log(publicnotes)
    res.json({ publicnotes })
  } catch (error) {
    return res.status(400).json(error);
  }
})

router.get("/:noteName", async (req, res) => {
  const noteName = req.params.noteName;

  try {
    const note = await Notemodel.findOne({ noteName: noteName })


    if (!note) {
      return res.status(404).json({ message: "noteyok bulunamadı" });
    }
    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({
      message: " Takım bilgileri getirilirken hata oluştu !",
      error: error.message,
    });
  }
});
router.post('/', authMiddleware, async (req, res) => {
  //console.log(req.body)
  const { noteName, description, isPublic } = req.body;
  //console.log(description)
  //const descriptionString = JSON.stringify(description);
  //console.log(noteName)
  const userId = req.user.id;
  try {

    const hasNote = await Notemodel.findOne({ noteName })
    if (hasNote) {
      res.status(409).json("Not zaten var")
    }

    const newNote = new Notemodel({
      noteName,
      description,
      isPublic
    });


    const savedNote = await newNote.save();

    //const member = await Usermodel.findOne({ email: "user@mail.com" });

    const user = await Usermodel.findById(userId);
    // if (!member) {
    //   throw new Error('user bulunamadı');
    // }
    //console.log(savedNote)
    user.note.push(savedNote._id)
    //console.log("sacedNote._id", savedNote._id)
    //console.log("member.note", member.note)
    //console.log("savedNote.members", savedNote.members)

    savedNote.members.push(user._id)
    await savedNote.save();
    console.log(user)

    res.status(201).json({ message: "Not kaydedildi" });
  } catch (error) {
    console.error("Not kaydedilemedi", error);
    res.status(500).json({ message: "Not kaydedilemedi" });
  }
});



module.exports = router