const mongoose = require('../db/db.js')

var Schema = mongoose.Schema 

const userSchema = new Schema({
    fullname: String,
    

    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: Schema.Types.ObjectId, 
        ref: 'Role' ,
        required: false 
    },
    team: [{type: Schema.Types.ObjectId,ref: 'Team',required: false }],
    note: {
        type: Schema.Types.ObjectId,
        ref: 'Note',
        required: false 
    }
});


var user = mongoose.model("User" , userSchema)

module.exports = user;