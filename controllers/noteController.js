const Notemodel = require("../models/note");
const Usermodel = require("../models/user");

const idDecoder = require("../iddecoder.js");

module.exports.getNotesToHome = async (req, res) => {
  try {
    const userId = req.user.id;
    const member = await Notemodel.find({ members: userId }).populate(
      "noteName"
    );
    const allnotes = await Notemodel.find({}).sort({ _id: -1 });
    const allNotesData = allnotes.map((note) => {
      const jsonString = JSON.stringify(note._id);
      const encodedid = btoa(jsonString).toString("base64");
      return {
        noteName: note.noteName,
        noteId: encodedid,
        noteDetails: note.description,
      };
    });
    res.json({ allNotes: allNotesData, member: member });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.getNotesByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    const myNotes = await Notemodel.find({ members: userId }).sort({ _id: -1 });

    const notesData = myNotes.map((note) => {
      const jsonString = JSON.stringify(note._id);
      const encodedid = btoa(jsonString).toString("base64");

      return {
        noteName: note.noteName,
        noteId: encodedid,
      };
    });
    res.json({ notesData });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.updateNote = async (req, res) => {
  const { id, description, noteName } = req.body;

  try {
    const noteId = idDecoder(id);

    const note = await Notemodel.findByIdAndUpdate(
      noteId,
      { description, noteName },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ message: "Not bulunamadı" });
    }

    return res.status(200).json({ message: "Not başarıyla güncellendi", note });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Not güncellenirken bir hata oluştu" });
  }
};

module.exports.createNote = async (req, res) => {
  const userId = req.user.id;
  try {
    const newNote = new Notemodel({
      noteName: "Untitled",
      members: userId,
      isPublic: false,
      description: "",
    });
    const savedNote = await newNote.save();
    console.log("savedNote:", savedNote);

    const jsonString = JSON.stringify(savedNote._id);
    const encodedid = btoa(jsonString).toString("base64");

    const notesData = {
      noteName: savedNote.noteName,
      noteId: encodedid,
    };
    console.log("notesData:", notesData);

    return res.status(200).json({ notesData });
  } catch (error) {
    return res.status(500).json(error);
  }
};

module.exports.deleteNote = async (req, res) => {
  const noteId = idDecoder(req.params.noteId);
  const noteName = req.params.noteName;

  try {
    const note = await Notemodel.findById(noteId);

    if (!note) {
      return res.status(404).json({ message: "Not bulunamadı" });
    }

    // if (note.noteName !== noteName) {
    //   return res.status(400).json({ message: "Note ID ve isim eşleşmiyor" });
    // }

    await note.deleteOne();

    res.status(200).json({ message: "Not başarıyla silindi" });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.editor = async (req, res) => {
  try {
    const allnotes = await Notemodel.find({}).sort({ _id: -1 });
    res.status(200).json({ allnotes });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.getEditorById = async (req, res) => {
  const id = req.params.id;
  try {
    const noteId = idDecoder(id);
    const note = await Notemodel.findById(noteId);
    res.status(200).json({ note });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.createNoteByPublic = async (req, res) => {
  const { noteName, description, isPublic } = req.body;
  const userId = req.user.id;
  try {
    const hasNote = await Notemodel.findOne({ noteName });
    if (hasNote) {
      return res.status(409).json("Not zaten var");
    }

    const newNote = new Notemodel({
      noteName,
      description,
      isPublic,
    });

    const savedNote = await newNote.save();
    const user = await Usermodel.findById(userId);
    user.note.push(savedNote._id);

    savedNote.members.push(user._id);
    await savedNote.save();

    res.status(201).json({ message: "Not kaydedildi" });
  } catch (error) {
    res.status(500).json(error);
  }
};
