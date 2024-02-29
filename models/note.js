const mongoose = require('../db/db.js')



const Schema = mongoose.Schema;

const noteSchema = new Schema({
    noteName: {
        type: String,
        required: true,
        unique: false
    },
    description: {
        type: String,
        required: false,
        unique: false
    }
});

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
