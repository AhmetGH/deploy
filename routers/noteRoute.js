var express = require("express")
var router = express.Router()
//var noteController = require("../controllers/noteController")
const Notemodel = require('../models/note')
const Usermodel = require("../models/user")

const authMiddleware = require('../middlewares');



//Returns the notes according to the user's ID. 
//
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const member = await Notemodel.find({ members: userId }).populate('noteName');
    const allnotes = await Notemodel.find({}).sort({ _id: -1 });
    res.json({ allnotes: allnotes, member: member })
  } catch (error) {
    return res.status(400).json(error);
  }
})

//Returns the user's own notes using the user's ID.
//
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const myNotes = await Notemodel.find({ members: userId }).sort({ _id: -1 });

    const notesData = myNotes.map(note => ({
      noteName: note.noteName,
      noteId: note._id
    }));
    res.json({ notesData });
  } catch (error) {
    return res.status(400).json(error);
  }
})


router.get("/member", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const member = await Notemodel.find({ members: userId }).populate('noteName');
    res.json({ member })
  } catch (error) {
    return res.status(400).json(error);
  }
})


router.put('/update', async (req, res) => {

  const { noteId, description, noteName } = req.body;
  console.log(req.body)
  try {
    // Veritabanında ilgili notun ID'sini bul
    const note = await Notemodel.findByIdAndUpdate(noteId, { description, noteName }, { new: true });
    if (!note) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }
    console.log("note :", note)
    return res.status(200).json({ message: 'Not başarıyla güncellendi', note });
  } catch (error) {
    return res.status(500).json({ message: 'Not güncellenirken bir hata oluştu' });
  }
});


//Creates a new note for the user
//
router.post('/create', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {

    const newNote = new Notemodel({
      noteName: 'untitled',
      members: userId,
      isPublic: false,
      description: "",
    });
    const savedNote = await newNote.save();

    return res.status(200).json({ message: 'Not başarıyla güncellendi', noteId: savedNote._id, noteName: savedNote.noteName });
  } catch (error) {
    console.error('Not güncellenirken bir hata oluştu:', error);
    return res.status(500).json({ message: 'Not güncellenirken bir hata oluştu' });
  }
});


router.delete('/:noteId/:noteName', authMiddleware, async (req, res) => {
  console.log(req.params)
  const noteId = req.params.noteId;
  const noteName = req.params.noteName;
  console.log(noteName, noteId)

  try {
    const note = await Notemodel.findById(noteId);

    if (!note) {
      return res.status(404).json({ message: "Not bulunamadı" });
    }

    if (note.noteName !== noteName) {
      return res.status(400).json({ message: "Note ID ve isim eşleşmiyor" });
    }

    await note.deleteOne();

    res.status(200).json({ message: "Not başarıyla silindi" });
  } catch (error) {
    console.error("Not silinemedi", error);
    res.status(500).json({ message: "Not silinemedi" });
  }
});





router.get("/quill", authMiddleware, async (req, res) => {
  try {
    const allnotes = await Notemodel.find({}).sort({ _id: -1 });
    res.status(200).json({ allnotes })
  } catch (error) {
    return res.status(400).json(error);
  }
})

router.get("/quill/:noteId", authMiddleware, async (req, res) => {
  const noteId = req.params.noteId;
  try {
    console.log(noteId)
    const note = await Notemodel.findById(noteId);

    console.log(note)
    res.status(200).json({ note })
  } catch (error) {
    return res.status(400).json(error);
  }
})

router.get("/main", async (req, res) => {
  try {
    const publicnotes = await Notemodel.find({ isPublic: true }).sort({ _id: -1 });
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
  const { noteName, description, isPublic } = req.body;
  const userId = req.user.id;
  try {

    const hasNote = await Notemodel.findOne({ noteName })
    if (hasNote) {
      return res.status(409).json("Not zaten var")
    }

    const newNote = new Notemodel({
      noteName,
      description,
      isPublic
    });

    const savedNote = await newNote.save();
    const user = await Usermodel.findById(userId);
    user.note.push(savedNote._id)


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