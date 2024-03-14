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
    },
    isPublic: {
        type: Boolean,
        required: false,
        unique: false
    },

    members: [{ type: Schema.Types.ObjectId, ref: 'User', required: false }]
});

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
