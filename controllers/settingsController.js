const Usermodel = require("../models/user");
const bcrypt = require("bcrypt");

module.exports.userSettings = async (req, res) => {
  try {
    const user_profile = await Usermodel.findById(req.user.id);
    if (!user_profile)
      return res.status(400).json({ message: "Kullanıcı bulunamadı" });
    return res.status(200).json(user_profile);
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.updateUserSettings = async (req, res) => {
  const { email, currentPass, newPass } = req.body;

  try {
    if (newPass) {
      const user = await Usermodel.findOne({
        _id: req.user.id,
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid user" });
      }

      // Compare the current password with the hashed password in the database
      const isPasswordCorrect = await bcrypt.compare(
        currentPass,
        user.password
      );
      if (!isPasswordCorrect) {
        return res
          .status(400)
          .json({ message: "Şuanki şifreniz yanlış girdiniz" });
      }

      if (currentPass === newPass) {
        return res.status(400).json({
          message: "Yeni şifreniz eski şifrenizle aynı olamaz",
        });
      }

      try {
        // Hash the new password before updating
        const hashedNewPass = await bcrypt.hash(newPass, 10); // 10 is the salt rounds

        const user_profile = await Usermodel.findByIdAndUpdate(
          req.user.id,
          { password: hashedNewPass },
          { new: true }
        );

        if (!user_profile) {
          return res.status(400).json({ message: "Failed to update user" });
        }

        return res.sendStatus(200);
      } catch (error) {
        return res.status(500).json(error);
      }
    }

    if (email) {
      try {
        const user_profile = await Usermodel.findByIdAndUpdate(
          req.user.id,
          { email },
          { new: true }
        );
        if (!user_profile)
          return res.status(400).json({ message: "Kullanıcı güncellenemedi" });
        return res.status(200).json(user_profile);
      } catch (error) {
        return res.status(500).json({
          message: "Üye bilgileri güncellenirken bir hata oluştu",
          error: error.message,
        });
      }
    }
  } catch (error) {
    return res.status(500).json(error);
  }
};

module.exports.userProfile = async (req, res) => {
  try {
    const user_profile = await Usermodel.findById(req.user.id).populate(
      "fullname title description"
    );
    if (!user_profile)
      return res.status(400).json({ message: "Kullanıcı bulunamadı" });
    return res.status(200).json(user_profile);
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.updateUserProfile = async (req, res) => {
  const { fullname, title, description } = req.body;

  try {
    const user_profile = await Usermodel.findByIdAndUpdate(
      req.user.id,
      { fullname, title, description },
      { new: true }
    );
    if (!user_profile)
      return res.status(400).json({ message: "Kullanıcı güncellenemedi" });
    return res.status(200).json(user_profile);
  } catch (error) {
    return res.status(500).json(error);
  }
};
