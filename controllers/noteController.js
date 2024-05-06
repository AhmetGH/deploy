const Notemodel = require("../models/note");
const Usermodel = require("../models/user");

const idDecoder = require("../iddecoder.js");

module.exports.getNotesToHome = async (req, res) => {
  try {
    const allnotes = await Notemodel.find({ isPublic: true })
      .populate("noteName")
      .sort({ _id: -1 });

    const allNotesData = allnotes.map((note) => {
      const jsonString = JSON.stringify(note._id);
      const encodedid = btoa(jsonString).toString("base64");
      return {
        noteName: note.noteName,
        noteId: encodedid,
        noteDetails: note.description,
      };
    });
    res.json({ allNotes: allNotesData });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.addFavorite = async (req, res) => {
  const userId = req.user.id;
  const noteId = idDecoder(req.body.noteId);

  try {
    const user = await Usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.favoritePosts.includes(noteId)) {
      return res.status(400).json({ error: "Note already in favorites" });
    }
    user.favoritePosts.push(noteId);
    await user.save();
    return res.status(200).json({ message: "Note added to favorites" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
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
module.exports.getByIdFavorites = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await Usermodel.findById(userId)
      .populate({
        path: "favoritePosts",
        select: "id noteName operationDate",
        options: { sort: { operationDate: -1 } },
      })
      .select("fullname favoritePosts");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const favoriteNotes = user.favoritePosts.map((note) => ({
      id: btoa(JSON.stringify(note._id)).toString("base64"),
      noteName: note.noteName,
      operationDate: calculateTimeAgo(note.operationDate),
    }));

    return res.status(200).json({ fullname: user.fullname, favoriteNotes });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports.deleteFavorite = async (req, res) => {
  const userId = req.user.id;
  const noteId = idDecoder(req.params.noteId);

  try {
    const user = await Usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.favoritePosts.includes(noteId)) {
      return res.status(400).json({ error: "Note not found in favorites" });
    }

    if (user) {
      const index = user.favoritePosts.indexOf(noteId);
      if (index > -1) {
        user.favoritePosts.splice(index, 1);
        await user.save();
      } else {
      }
    } else {
    }
    return res.status(200).json({ message: "Note removed from favorites" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports.publishNote = async (req, res) => {
  const isPublished = req.body.isPublished;
  const noteId = idDecoder(req.params.noteId);

  try {
    const note = await Notemodel.findById(noteId);
    if (!note) {
      return res.status(404).json({ error: "cannot find note" });
    }
    note.isPublic = isPublished;
    await note.save();

    res.status(200).json({ message: "Publish success" });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.getNotesByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    const myNotes = await Notemodel.find({ members: userId }).sort({
      operationDate: -1,
    });

    const notesData = myNotes.map((note) => {
      const jsonString = JSON.stringify(note._id);
      const encodedid = btoa(jsonString).toString("base64");

      return {
        noteName: note.noteName,
        noteId: encodedid,
        operationDate: calculateTimeAgo(note.operationDate),
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
      { description, noteName, operationDate: new Date() },
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
  const {accessTeam, accessUser } =req.body;
  try {
    const newNote = new Notemodel({
      noteName: "Untitled",
      members: userId,
      isPublic: false,
      description: "",
      accessTeam,
      accessUser,
    });

    const savedNote = await newNote.save();

    const jsonString = JSON.stringify(savedNote._id);
    const encodedid = btoa(jsonString).toString("base64");

    const notesData = {
      noteName: savedNote.noteName,
      noteId: encodedid,
    };

    return res.status(200).json({ notesData });
  } catch (error) {
    return res.status(500).json(error);
  }
};

module.exports.deleteNote = async (req, res) => {
  const noteId = idDecoder(req.params.noteId);

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
  const userId = req.user.id;
  try {
    const noteId = idDecoder(id);
    var noteData = await Notemodel.findById(noteId);
    const user = await Usermodel.findById(userId);
    const noteExists = user.favoritePosts.some((id) => id.equals(noteId));
    var note = { ...noteData.toObject(), isFavorite: noteExists };
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
