
const Notemodel = require('../models/note')
const Usermodel = require("../models/user")




module.exports.getNotes = async (req, res) => {
    try {
      const allnotes = await Notemodel.find({}).sort({_id : -1});
      res.json(allnotes)
    } catch (error) {
      return res.status(400).json(error);
    }
  }

module.exports.postNotes = async (req, res) => {
    try {
      
    
      const userId=req.user.id;
      const user = await Usermodel.findById(userId).populate('note', 'noteName description');
   
      
      const newNote = new Notemodel({
          noteName : req.body.noteName,
          description: req.body.note
      });
 
    
      const savedNote = await newNote.save();
   
  
  

  
      res.status(201).json({ message: "Not kaydedildi" });
  } catch (error) {
      console.error("Not kaydedilemedi", error);
      res.status(500).json({ message: "Not kaydedilemedi" });
  }
  };

