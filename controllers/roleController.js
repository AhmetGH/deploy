const Rolemodel = require('../models/role')

module.exports.postRole = async (req, res) => {
    try{
        const {name , description} = req.body
        const newRole = new Rolemodel({
          name: name,
          description: description,
        });
  
  
      const savedRole = await newRole.save();
  
      res.status(201).json(savedRole);
    } catch (error) {
        console.error('Rol ekleme hatası:', error);
        res.status(500).json({ error: 'Rol eklenemedi' });
    }
  }
  
  // Rol bilgilerini getirme endpoint'i
  module.exports.getRoles = async (req, res) => {
    try {
        // Tüm rolleri MongoDB'den getir
        const roles = await Rolemodel.find();
        
        res.status(200).json(roles);
    } catch (error) {
        console.error('Roller getirme hatası:', error);
        res.status(500).json({ error: 'Roller getirilemedi' });
    }
  }


  
  