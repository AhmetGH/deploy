const Notemodel = require("../models/note");
const Usermodel = require("../models/user");
const TeamModel = require("../models/team.js");
const idDecoder = require("../iddecoder.js");
const TopicModel = require("../models/topic.js");
const notificationModel = require("../models/notification.js");
const path = require("path");
const io = require("socket.io")();

module.exports.getSingleNoteById = async (req, res) => {
  const noteId = idDecoder(req.params.noteId);
  try {
    const theNote = await Notemodel.findById(noteId).populate({
      path: "owner",
      model: "User",
      select: "fullname",
    });

    const jsonString = JSON.stringify(theNote._id);
    const encodedid = btoa(jsonString).toString("base64");
    const [operationTime, operationDate] = calculateTimeAgo(
      theNote.operationDate
    );
    return res.status(200).json({
      note: {
        noteName: theNote.noteName,
        noteId: encodedid,
        noteDetails: theNote.description,
        // accessTeam: note.accessTeam,
        // accessUser: note.accessUser,
        fullName: theNote.owner.fullname,
        owner: theNote.owner._id,
        operationTime: operationTime,
        operationDate: operationDate,
      },
    });
  } catch (err) {
    return res.status(400).json(error);
  }
};

module.exports.getNotesToHome = async (req, res) => {
  userId = req.user.id;
  try {
    const allnotes = await Notemodel.find({ isPublic: true })
      .populate({
        path: "owner",
        model: "User",
        select: "fullname",
      })
      .sort({ _id: -1 });

    const allNotesData = allnotes.map((note) => {
      var canEdit = false;
      const jsonString = JSON.stringify(note._id);
      const encodedid = btoa(jsonString).toString("base64");
      const [operationTime, operationDate] = calculateTimeAgo(
        note.operationDate
      );
      return {
        noteName: note.noteName,
        noteId: encodedid,
        noteDetails: note.description,
        accessTeam: note.accessTeam,
        accessUser: note.accessUser,
        editTeam: note.editTeam,
        editUser: note.editUser,
        fullName: note.owner.fullname,
        owner: note.owner._id,
        operationTime: operationTime,
        operationDate: operationDate,
        canEdit: canEdit,
      };
    });
    const myTeam = await TeamModel.find({ members: userId }).populate(
      "members"
    );

    const myTeamIds = myTeam.map((item) => item._id.toString());
    mergedIds = [...myTeamIds, userId];
    const matchingPosts = [];

    allNotesData.forEach((post) => {
      if (
        (Array.isArray(post.accessTeam) &&
          post.accessTeam.some((team) =>
            mergedIds.includes(team.toString())
          )) ||
        (Array.isArray(post.accessUser) &&
          post.accessUser.some((user) =>
            mergedIds.includes(user.toString())
          )) ||
        mergedIds.includes(post.owner.toString())
      ) {
        matchingPosts.push(post);
        if (
          (Array.isArray(post.editTeam) &&
            post.editTeam.some((team) =>
              mergedIds.includes(team.toString())
            )) ||
          (Array.isArray(post.editUser) &&
            post.editUser.some((user) =>
              mergedIds.includes(user.toString())
            )) ||
          mergedIds.includes(post.owner.toString())
        ) {
          post.canEdit = true;
        }
      }
    });

    res.json({ allNotes: matchingPosts });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.addFavorite = async (req, res, io) => {
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
    io.emit("addFavoriteNote");
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
    const favoriteNotes = user.favoritePosts.map((note) => {
      const [operationTime, operationDate] = calculateTimeAgo(
        note.operationDate
      );
      return {
        id: btoa(JSON.stringify(note._id)).toString("base64"),
        noteName: note.noteName,
        operationTime: operationTime,
        operationDate: operationDate,
      };
    });

    return res.status(200).json({ fullname: user.fullname, favoriteNotes });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports.deleteFavorite = async (req, res, io) => {
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
    io.emit("deleteFavoriteNote");
    return res.status(200).json({ message: "Note removed from favorites" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports.publishNote = async (req, res, io) => {
  const isPublished = req.body.isPublished;
  const noteId = idDecoder(req.params.noteId);
  const myUserId = req.user.id;

  const accessTeam = req.body.accessTeam;
  const accessUser = req.body.accessUser;
  const editTeam = req.body.editTeam;
  const editUser = req.body.editUser;

  try {
    const note = await Notemodel.findById(noteId);
    if (!note) {
      return res.status(404).json({ error: "cannot find note" });
    }
    note.isPublic = isPublished;

    const updatedNote = await Notemodel.findByIdAndUpdate(
      noteId,
      { accessTeam, accessUser, editTeam, editUser },
      { new: true }
    );
    await updatedNote.save();
    const publisherName = await Usermodel.findById(myUserId).populate(
      "fullname"
    );

    if (isPublished === true) {
      if (note.accessTeam.length > 0) {
        note.accessTeam.forEach(async (teamId) => {
          const teamWithMembers = await TeamModel.findById(teamId).populate({
            path: "members",
            select: "fullname _id",
          });

          if (
            teamWithMembers.members !== null &&
            teamWithMembers.members.length > 0
          ) {
            teamWithMembers.members.forEach(async (member) => {
              let notification;
              if (member._id.toString() !== myUserId) {
                notification = new notificationModel({
                  userId: member._id,
                  message: `${publisherName.fullname} , ${teamWithMembers.teamName} ile bir not paylaştı.`,
                  url: "/home",
                });

                await notification.save();
                io.emit("notification", notification);
              }
            });
          }
        });
      }

      if (note.accessUser.length > 0) {
        note.accessUser.forEach(async (userId) => {
          const user = await Usermodel.findById(userId).populate("fullname");
          const notification = new notificationModel({
            userId: user._id,
            message: `${publisherName.fullname} , sizinle bir not paylaştı.`,
            url: "/home",
          });
          await notification.save();
          io.emit("notification", notification);
        });
      }
    }
    io.emit("publisNote");
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
      const [operationTime, operationDate] = calculateTimeAgo(
        note.operationDate
      );

      return {
        noteName: note.noteName,
        noteId: encodedid,
        operationTime: operationTime,
        operationDate: operationDate,
      };
    });
    res.json({ notesData });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.updateNote = async (req, res, io) => {
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

    io.emit("updateNote");
    return res.status(200).json({ message: "Not başarıyla güncellendi", note });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Not güncellenirken bir hata oluştu" });
  }
};

module.exports.createNote = async (req, res, io) => {
  const userId = req.user.id;
  const { accessTeam, accessUser, editTeam, editUser } = req.body;
  try {
    const newNote = new Notemodel({
      owner: userId,
      noteName: "Untitled",
      members: userId,
      isPublic: false,
      description: "",
      accessTeam,
      accessUser,
      editTeam,
      editUser,
    });
    const savedNote = await newNote.save();

    const jsonString = JSON.stringify(savedNote._id);
    const encodedid = btoa(jsonString).toString("base64");

    const notesData = {
      noteName: savedNote.noteName,
      noteId: encodedid,
    };
    io.emit("createNote");

    return res.status(200).json({ notesData });
  } catch (error) {
    return res.status(500).json(error);
  }
};

module.exports.deleteNote = async (req, res, io) => {
  const noteId = idDecoder(req.params.noteId);

  try {
    const note = await Notemodel.findById(noteId);

    if (!note) {
      return res.status(404).json({ message: "Not bulunamadı" });
    }

    await note.deleteOne();
    io.emit("deleteNote");

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

module.exports.getAccessOfNote = async (req, res) => {
  const id1 = req.params.noteId;
  const id = idDecoder(id1);
  userId = req.user.id;
  try {
    const topic = await TopicModel.findOne({ post: { $in: [id] } });
    const post = await Notemodel.findById(id);
    const accessTeam = topic.accessTeam.map((member) => member._id.toString());
    const accessUser = topic.accessUser.map((member) => member._id.toString());
    const promises = accessUser.map(async (item) => {
      const members = await Usermodel.find({ _id: item }).select(
        "_id fullname"
      );
      return members.map((member) => ({
        _id: member._id.toString(),
        fullname: member.fullname,
      }));
    });

    const members = await Promise.all(promises);

    const member = members.flat();

    const promises2 = accessTeam.map(async (item) => {
      const members1 = await Usermodel.find({ team: item.toString() }).select(
        "_id fullname"
      );
      return members1.map((member) => ({
        _id: member._id.toString(),
        fullname: member.fullname,
      }));
    });

    const teamMembers = await Promise.all(promises2);

    const allMembers = teamMembers.flat();

    const promises3 = accessTeam.map(async (item) => {
      const teams = await TeamModel.find({ _id: item.toString() }).select(
        "_id teamName"
      );
      return teams.map((member) => ({
        _id: member._id.toString(),
        teamName: member.teamName,
      }));
    });

    const team = await Promise.all(promises3);

    const allteams = team.flat();
    const allusers = [...allMembers, ...member];
    const uniqueValues = {};

    allusers.forEach((item) => {
      // Her değeri nesnede anahtar olarak kullanarak kontrol ediyoruz
      // Eğer değer nesnede yoksa nesneye ekliyoruz
      if (!uniqueValues[item._id.toString()]) {
        uniqueValues[item._id.toString()] = item;
      }
    });

    const uniqueArray = Object.values(uniqueValues);
    const myTeam = await TeamModel.find({ members: userId }).populate(
      "members"
    );

    const myTeamIds = myTeam.map((item) => item._id.toString());
    mergedIds = [...myTeamIds, userId];
    let canEdit = false;
    if (
      (Array.isArray(post.editTeam) &&
        post.editTeam.some((team) => mergedIds.includes(team.toString()))) ||
      (Array.isArray(post.editUser) &&
        post.editUser.some((user) => mergedIds.includes(user.toString()))) ||
      mergedIds.includes(post.owner.toString())
    ) {
      canEdit = true;
    }

    return res.json({ team: allteams, users: uniqueArray, edit: canEdit });
  } catch (error) {}
};
