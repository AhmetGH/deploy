const Aboutmodel = require("../models/about");

module.exports.allAbouts = async (req, res) => {
  try {
    const allAbouts = await Aboutmodel.find({}).sort({ _id: -1 });
    res.status(200).json({ allAbouts: allAbouts });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.createAbout = async (req, res) => {
  const { aboutName, description } = req.body;
  try {
    const hasAbout = await Aboutmodel.findOne({ aboutName });
    if (hasAbout) {
      res.status(409).json("Not zaten var");
    }

    const newAbout = new Aboutmodel({
      aboutName: aboutName,
      description: description,
    });
    const savedAbout = await newAbout.save();

    res.status(201).json({ message: "Hakkında kaydedildi" });
  } catch (error) {
    res.status(500).json(error);
  }
};
