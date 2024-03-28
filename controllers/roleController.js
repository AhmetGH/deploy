const Rolemodel = require("../models/role");

module.exports.createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const newRole = new Rolemodel({
      name: name,
      description: description,
    });

    const savedRole = await newRole.save();

    res.status(201).json(savedRole);
  } catch (error) {
    res.status(500).json({ error: "Rol eklenemedi" });
  }
};

module.exports.allRoles = async (req, res) => {
  try {
    const roles = await Rolemodel.find();

    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ error: "Roller getirilemedi" });
  }
};
