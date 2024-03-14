
const Usermodel = require("../models/user");
const Rolemodel = require("../models/role");
const Teammodel = require("../models/team");

module.exports.getTeamMates = async (req, res) => {
  const teamName = req.params.teamName;

  try {
    const team = await Teammodel.findOne({ teamName: teamName })
      .populate({
        path: "members",
        select: "email fullname title description",
        populate: { path: "role", select: "name" },
      })
      .select("-_id members")
      .exec();

    if (!team) {
      return res.status(404).json({ message: "Takım bulunamadı" });
    }
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({
      message: " Takım bilgileri getirilirken hata oluştu !",
      error: error.message,
    });
  }
};

module.exports.getTeams = async (req, res) => {
  try {
    const teams = await Teammodel.find();
    res.status(200).json(teams);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Takımlar alınmadı", error: error.message });
  }
};

module.exports.postTeam =  async (req, res) => {
  const { teamName, description, userEmail, userRol } = req.body;

  try {
    const hasTeam = await Teammodel.findOne({ teamName });

    if (hasTeam) {
      return res.status(400).json("Takım zaten var");
    }

    const yeniTakim = new Teammodel({
      teamName,
      description,
    });

    await yeniTakim.save();

    const member = await Usermodel.findOne({ email: userEmail });

    if (!member) {
      throw new Error("user bulunamadı");
    }

    const rol = await Rolemodel.findOne({ name: userRol });

    if (!rol) {
      throw new Error("rol bulunamadı");
    }

    member.role = rol._id;
    member.team.push(yeniTakim._id);
    await member.save();

    yeniTakim.members.push(member._id);
    await yeniTakim.save();
    res.sendStatus(200);
  } catch (error) {}
};

module.exports.postTeamMember =  async (req, res) => {
  try {
    const teamName = req.params.teamName;
    const { email, role } = req.body;

    // Takımı bul
    const team = await Teammodel.findOne({ teamName });
    if (!team) {
      return res.status(404).json({ message: "Takım bulunamadı" });
    }

    // Kullanıcıyı bul
    const user = await Usermodel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    // Rolü bul
    const roleObject = await Rolemodel.findOne({ name: role });
    if (!roleObject) {
      return res.status(404).json({ message: "Rol bulunamadı" });
    }

    // Kullanıcının takımda olup olmadığını kontrol et
    if (team.members.includes(user._id)) {
      return res
        .status(400)
        .json({ message: "Kullanıcı zaten bu takımda bulunuyor" });
    }

    // Kullanıcıya rol ve takım bilgilerini ata
    user.role = roleObject._id;
    user.team.push(team._id);
    await user.save();

    // Takıma kullanıcıyı ekle
    team.members.push(user._id);
    await team.save();

    return res
      .status(201)
      .json({ message: "Kullanıcı başarıyla takıma eklendi", user });
  } catch (error) {
    return res.status(500).json({
      message: "Kullanıcı takıma eklenirken bir hata oluştu",
      error: error.message,
    });
  }
};





module.exports.putMember = async function (req, res) {
    const memberId = req.params.id;
    const updatedMember = req.body; // Düzenlenmiş üye bilgisi
  
  
    try {
      // Üye bilgisini güncelle
      const member = await Usermodel.findByIdAndUpdate(memberId, updatedMember, { new: true });
  
      if (!member) {
        return res.status(404).json({ message: 'Üye bulunamadı' });
      }
  
      res.status(200).json({ message: 'Üye başarıyla güncellendi', member });
    } catch (error) {
      res.status(500).json({ message: 'Üye güncellenirken bir hata oluştu', error: error.message });
    }
  };


