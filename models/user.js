const mongoose = require("../db/db.js");

var Schema = mongoose.Schema;

const userSchema = new Schema({
  fullname: String,
  title: { type: String, required: false },
  description: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  role: { type: Schema.Types.ObjectId, ref: "Role", required: false },
  favoritePosts: [
    { type: Schema.Types.ObjectId, ref: "Note", required: false },
  ],
  favoriteTopic: [
    { type: Schema.Types.ObjectId, ref: "Topic", required: false, index: true },
  ],
  team: [{ type: Schema.Types.ObjectId, ref: "Team", required: false }],
  isActive: { type: Boolean, default: false },
  emailToken: { type: String, required: false, default: undefined },
  employmentType: { type: String, required: false },
  location: { type: String, required: false },
  age: { type: Number, required: false },
});
var user = mongoose.model("User", userSchema);

module.exports = user;
