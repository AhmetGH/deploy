const mongoose = require('../db/db.js')
const Schema = mongoose.Schema;


const aboutSchema = new Schema({
    aboutName: {
        type: String,
        required: true,
        unique: false
    },
    description: {
        type: String,
        required: false,
        unique: false
    },
});

const About = mongoose.model('About', aboutSchema);

module.exports = About;
