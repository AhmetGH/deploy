const mongoose = require('../db/db.js');
const Schema = mongoose.Schema;

// Takım şeması
const teamSchema = new Schema({
    teamName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' ,required : false}]
});


const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
