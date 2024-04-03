const mongoose = require("../db/db.js");
const Schema = mongoose.Schema;

const aboutSchema = new Schema({
  aboutName: {
    type: String,
    required: true,
    unique: false,
  },
  description: {
    type: String,
    required: false,
    unique: false,
  },
  isPublic: {
    type: Boolean,
    required: true,
    unique: false,
  },
  noteId: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: false,
  },
});

const About = mongoose.model("About", aboutSchema);

module.exports = About;
