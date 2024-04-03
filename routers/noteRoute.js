var express = require("express");
var router = express.Router();

const authMiddleware = require("../middlewares");
const noteController = require("../controllers/noteController");

router.get("/", authMiddleware, noteController.getNotesToHome);

router.put("/publish/:noteId", authMiddleware, noteController.publishNote);

router.get("/my", authMiddleware, noteController.getNotesByUserId);

router.put("/update", noteController.updateNote);

router.post("/create", authMiddleware, noteController.createNote);

router.delete("/:noteId", authMiddleware, noteController.deleteNote);

router.get("/quill", authMiddleware, noteController.editor);

router.get("/quill/:id", authMiddleware, noteController.getEditorById);

// router.get("/main", async (req, res) => {
//   try {
//     const publicnotes = await Notemodel.find({ isPublic: true }).sort({
//       _id: -1,
//     });
//     res.json({ publicnotes });
//   } catch (error) {
//     return res.status(400).json(error);
//   }
// });

// router.get("/:noteName", async (req, res) => {
//   const noteName = req.params.noteName;

//   try {
//     const note = await Notemodel.findOne({ noteName: noteName });

//     if (!note) {
//       return res.status(404).json({ message: "noteyok bulunamadı" });
//     }
//     res.status(200).json(note);
//   } catch (error) {
//     res.status(500).json({
//       message: " Takım bilgileri getirilirken hata oluştu !",
//       error: error.message,
//     });
//   }
// });

router.post("/", authMiddleware, noteController.createNoteByPublic);
module.exports = router;
