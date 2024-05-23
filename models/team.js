const mongoose = require("../db/db.js");
const Schema = mongoose.Schema;

// Takım şeması
const teamSchema = new Schema({
  teamName: { type: String, required: true },
  teamDescription: { type: String, required: false },
  members: [
    { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
  ],
});

const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
