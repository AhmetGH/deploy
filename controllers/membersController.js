const Usermodel = require("../models/user")


module.exports.members = async function (req, res) {
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