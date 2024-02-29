const mongoose = require('../db/db.js')



const Schema = mongoose.Schema;

const roleSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: false,
        unique: false
    }
});

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
