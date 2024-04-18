const Aboutmodel = require("../models/about");
const idDecoder = require("../iddecoder.js");

module.exports.allAbouts = async (req, res) => {
  try {
    const allAbouts = await Aboutmodel.find({ isPublic: true }).sort({
      _id: -1,
    });

    const allAboutData = allAbouts.map((about) => {
      const jsonString = JSON.stringify(about.noteId);
      const encodedid = btoa(jsonString).toString("base64");
      return {
        aboutName: about.aboutName,
        noteId: encodedid,
        aboutDescription: about.description,
      };
    });

    res.status(200).json({ allAbouts: allAboutData });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.aboutIsPublic = async (req, res) => {
  try {
    const noteId = idDecoder(req.params.noteId);

    const about = await Aboutmodel.findOne({ noteId: noteId });
    if (!about) {
      return res.status(200).json({ isPublic: false });
    }
    return res.status(200).json({ isPublic: about.isPublic });
  } catch (error) {
    return res.status(500).json(error);
  }
};

module.exports.createAbout = async (req, res) => {
  const { aboutName, description, isPublish } = req.body;
  const noteId = idDecoder(req.body.noteId);

  try {
    const existingAbout = await Aboutmodel.findOneAndUpdate(
      { noteId },
      {
        $set: {
          aboutName,
          description,
          isPublic: isPublish,
          noteId,
        },
      },
      { new: true, upsert: true }
    );

    if (existingAbout) {
      return res.status(200).json({ message: "Hakkında güncellendi" });
    } else {
      return res.status(201).json({ message: "Hakkında kaydedildi" });
    }
  } catch (error) {
    return res.status(500).json(error);
  }
};
