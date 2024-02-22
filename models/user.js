const mongoose = require('../db/db.js')

var Schema = mongoose.Schema 

var userSchema = new Schema({
    email : String,
    password : String
})

var user = mongoose.model("user" , userSchema)

module.exports = user;