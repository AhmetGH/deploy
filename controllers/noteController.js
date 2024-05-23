const Notemodel = require("../models/note");
const Usermodel = require("../models/user");
const TeamModel = require("../models/team.js");
const idDecoder = require("../iddecoder.js");
const TopicModel = require("../models/topic.js");
const notificationModel = require("../models/notification.js");

module.exports.getSingleNoteById = async (req, res) => {
  const noteId = idDecoder(req.params.noteId);
  const userId = req.user.id;

  try {
    const [theNote, user] = await Promise.all([
      Notemodel.findById(noteId).populate({
        path: "owner",
        model: "User",
        select: "fullname",
      }),
      Usermodel.findById(userId),
    ]);

    if (!theNote || !user) {
      return res.status(404).json({ error: "Note or user not found" });
    }

    const [readingTime, readingDate] = calculateReadingTime(
      theNote.readingTime
    );
    const isFavorite = user.favoritePosts.includes(noteId);

    const canEdit =
      theNote.editUser.includes(userId) ||
      theNote.editTeam.includes(userId) ||
      theNote.owner._id.toString() === userId;

    const [operationTime, operationDate] = calculateTimeAgo(
      theNote.operationDate
    );

    const jsonString = JSON.stringify(theNote._id);
    const encodedid = btoa(jsonString).toString("base64");

    return res.status(200).json({
      note: {
        noteName: theNote.noteName,
        noteId: encodedid, // Kullanıcıya not ID'sini ham halde göndermek daha iyi olabilir
        noteDetails: theNote.description,
        fullName: theNote.owner.fullname,
        owner: theNote.owner._id,
        operationTime,
        operationDate,
        readingTime,
        readingDate,
        canEdit,
        isFavorite,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const calculateReadingTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) {
    return [years, years !== 1 ? "Years" : "Year"];
  } else if (months > 0) {
    return [months, months !== 1 ? "Months" : "Month"];
  } else if (days > 0) {
    return [days, days !== 1 ? "Days" : "Day"];
  } else if (hours > 0) {
    return [hours, hours !== 1 ? "Hours" : "Hour"];
  } else if (minutes > 0) {
    return [minutes, minutes !== 1 ? "Minutes" : "Minute"];
  } else {
    return [seconds, seconds !== 1 ? "Seconds" : "Second"];
  }
};

module.exports.getNotesToHome = async (req, res) => {
  const userId = req.user.id;

  try {
    const [myTeam, user] = await Promise.all([
      TeamModel.find({ members: userId }),
      Usermodel.findById(userId),
    ]);

    const myTeamIds = myTeam.map((team) => team._id.toString());
    const accessibleIds = [userId, ...myTeamIds];

    const allnotes = await Notemodel.find({
      $or: [
        { accessUser: { $in: accessibleIds } },
        { accessTeam: { $in: accessibleIds } },
        { owner: userId },
      ],
      isPublic: true,
    })
      .populate("owner", "fullname")
      .sort({ _id: -1 });

    const allNotesData = allnotes.map((note) => {
      const [operationTime, operationDate] = calculateTimeAgo(
        note.operationDate
      );
      const [readingTime, readingDate] = calculateReadingTime(note.readingTime);
      const isFavorite = user.favoritePosts.includes(note._id);
      const canEdit =
        note.editUser.includes(userId) ||
        note.editTeam.some((team) => accessibleIds.includes(team.toString())) ||
        note.owner._id.toString() === userId;

      return {
        noteName: note.noteName,
        noteId: btoa(JSON.stringify(note._id)).toString("base64"),
        noteDetails: note.description,
        fullName: note.owner.fullname,
        owner: note.owner._id,
        readingTime,
        readingDate,
        operationTime,
        operationDate,
        canEdit,
        isFavorite,
      };
    });

    res.status(200).json({ allNotes: allNotesData });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to retrieve notes", error: error.message });
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
        select: "id noteName operationDate owner",
        options: { sort: { operationDate: -1 } },
      })
      .select("fullname favoritePosts");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const favoriteNotes = user.favoritePosts
      .filter((note) => note.owner.toString() === userId) // Şarta uymayan notları filtreler
      .map((note) => {
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
    console.log("favoriteNotes:", favoriteNotes);

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

  try {
    let note = await Notemodel.findById(noteId)
      .populate("accessTeam")
      .populate("accessUser");

    if (!note) {
      return res.status(404).json({ error: "cannot find note" });
    }

    note.isPublic = isPublished;
    note.accessTeam = req.body.accessTeam;
    note.accessUser = req.body.accessUser;
    note.editTeam = req.body.editTeam;
    note.editUser = req.body.editUser;

    await note.save();

    const publisherName = await Usermodel.findById(myUserId).populate(
      "fullname"
    );

    if (isPublished) {
      for (const team of note.accessTeam) {
        const teamWithMembers = await TeamModel.findById(team).populate(
          "members",
          "fullname _id"
        );

        for (const member of teamWithMembers.members) {
          if (member._id.toString() !== myUserId) {
            const notification = new notificationModel({
              userId: member._id,
              fullname: publisherName.fullname,
              teamName: teamWithMembers.teamName,
              type: "note",
              url: "/home",
            });

            io.emit("notification", notification);
            await notification.save();
          }
        }
      }

      for (const user of note.accessUser) {
        const userData = await Usermodel.findById(user).populate("fullname");

        const notification = new notificationModel({
          userId: userData._id,
          fullname: publisherName.fullname,
          teamName: "you",
          type: "note",
          url: "/home",
        });

        io.emit("notification", notification);
        await notification.save();
      }
    }

    io.emit("publishNote");

    res.status(200).json({ message: "Publish success" });
  } catch (error) {
    console.error("Error occurred during note publishing:", error);
    return res
      .status(400)
      .json({ error: "An error occurred while processing your request." });
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

const CalculateReadingTime = (description) => {
  const cleanedText = description.replace(/<[^>]+>/g, "");
  const words = cleanedText.split(/\s+/);
  const wordCount = words.length;
  return Math.floor(wordCount / 3);
};

module.exports.updateNote = async (req, res, io) => {
  const { id, description, noteName } = req.body;

  try {
    const noteId = idDecoder(id);
    const readingTime = CalculateReadingTime(description);
    const note = await Notemodel.findByIdAndUpdate(
      noteId,
      {
        description,
        noteName,
        readingTime: readingTime,
        operationDate: new Date(),
      },
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
      readingTime: 0,
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
  let allteams = "";
  let uniqueArray = [];
  let canEdit = false;
  try {
    const topic = await TopicModel.findOne({ post: { $in: [id] } });
    if (topic === null) {
      [allteams, uniqueArray] = await Promise.all([
        TeamModel.find({}),
        Usermodel.find({}),
      ]);
      canEdit = true;
    } else {
      const post = await Notemodel.findById(id);

      // const accessUser = topic.accessUser.map((member) =>
      //   member._id.toString()
      // );
      // const promises = accessUser.map(async (item) => {
      //   const members = await Usermodel.find({ _id: item }).select(
      //     "_id fullname"
      //   );
      //   return members.map((member) => ({
      //     _id: member._id.toString(),
      //     fullname: member.fullname,
      //   }));
      // });

      // const members = await Promise.all(promises);

      // const member = members.flat();
      /////////////////////////////////////
      // const accessUserIds = topic.accessUser.map((member) => member._id);

      // const members = await Usermodel.find({ _id: { $in: accessUserIds } })
      //   .select("_id fullname")
      //   .lean();

      // const member = members.map((member) => ({
      //   _id: member._id.toString(),
      //   fullname: member.fullname,
      // }));
      ////////////
      // const accessTeam = topic.accessTeam.map((member) =>
      //   member._id.toString()
      // );
      //       const promises2 = accessTeam.map(async (item) => {
      //         const members1 = await Usermodel.find({ team: item.toString() }).select(
      //           "_id fullname"
      //         );
      //         return members1.map((member) => ({
      //           _id: member._id.toString(),
      //           fullname: member.fullname,
      //         }));
      //       });

      //       const teamMembers = await Promise.all(promises2);

      //       const allMembers = teamMembers.flat();
      //////
      // const accessTeamIds = topic.accessTeam.map((member) => member._id);

      // const teamMembers = await Usermodel.find({ team: { $in: accessTeamIds } })
      //   .select("_id fullname")
      //   .lean();

      // const allMembers = teamMembers.map((member) => ({
      //   _id: member._id.toString(),
      //   fullname: member.fullname,
      // }));
      /////
      // const promises3 = topic.accessTeam.map(async (item) => {
      //   const teams = await TeamModel.find({ _id: item.toString() }).select(
      //     "_id teamName"
      //   );
      //   return teams.map((member) => ({
      //     _id: member._id.toString(),
      //     teamName: member.teamName,
      //   }));
      // });

      // const team = await Promise.all(promises3);

      // allteams = team.flat();
      /////
      // const allteams = await TeamModel.find({ _id: { $in: accessTeamIds } })
      // .select("_id teamName")
      // .lean();
      const accessUserIds = topic.accessUser.map((member) => member._id);
      const accessTeamIds = topic.accessTeam.map((member) => member._id);

      const [members, allMembers, allTeams] = await Promise.all([
        Usermodel.find({ _id: { $in: accessUserIds } })
          .select("_id fullname")
          .lean(),
        Usermodel.find({ team: { $in: accessTeamIds } })
          .select("_id fullname")
          .lean(),
        TeamModel.find({ _id: { $in: accessTeamIds } })
          .select("_id teamName")
          .lean(),
      ]);

      // Kullanıcılar

      const members1 = members.map((member) => ({
        _id: member._id.toString(),
        fullname: member.fullname,
      }));

      // Tüm takımlar
      allteams = allTeams.map((member) => ({
        _id: member._id.toString(),
        teamName: member.teamName,
      }));

      // Tüm üyeler
      const allMembers1 = allMembers.map((member) => ({
        _id: member._id.toString(),
        fullname: member.fullname,
      }));

      const allusers = [...allMembers1, ...members1];
      const uniqueValues = {};

      allusers.forEach((item) => {
        if (!uniqueValues[item._id]) {
          uniqueValues[item._id] = item;
        }
      });

      
      const myTeam = await TeamModel.find({ members: userId }).populate(
        "members"
      );

      const myTeamIds = myTeam.map((item) => item._id.toString());
      mergedIds = [...myTeamIds, userId];

      if (
        (Array.isArray(post.editTeam) &&
          post.editTeam.some((team) => mergedIds.includes(team.toString()))) ||
        (Array.isArray(post.editUser) &&
          post.editUser.some((user) => mergedIds.includes(user.toString()))) ||
        mergedIds.includes(post.owner.toString())
      ) {
        canEdit = true;
      }
    }
    return res.json({ team: allteams, users: uniqueArray, edit: canEdit });
  } catch (error) {}
};
