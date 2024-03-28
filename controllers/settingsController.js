const Usermodel = require("../models/user");

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
        password: currentPass,
      });

      if (!user) {
        return res.status(500).json({ message: "Şifreniz yanlış" });
      }

      if (currentPass === newPass || newPass === "")
        return res
          .status(400)
          .json({ message: "Lütfen şifrenizi düzgün giriniz" });

      try {
        const user_profile = await Usermodel.findByIdAndUpdate(
          req.user.id,
          { password: newPass },
          { new: true }
        );
        if (!user_profile)
          return res.status(400).json({ message: "Kullanıcı güncellenemedi" });
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
