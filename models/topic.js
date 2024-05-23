const mongoose = require("../db/db.js");
const Schema = mongoose.Schema;

const topicSchema = new Schema({
  topicName: { type: String, required: true, unique: false },
  parent: { type: Schema.Types.ObjectId, ref: "Topic", required: false },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
    index: true,
  },
  underElement: { type: Boolean, required: true, unique: false },
  children: [{ type: Schema.Types.ObjectId, ref: "Topic", required: false }],
  accessTeam: [
    { type: Schema.Types.ObjectId, ref: "Team", required: false, index: true },
  ],
  accessUser: [
    { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
  ],
  editTeam: [{ type: Schema.Types.ObjectId, ref: "Team", required: false }],
  editUser: [{ type: Schema.Types.ObjectId, ref: "User", required: false }],
  post: [{ type: Schema.Types.ObjectId, ref: "Note", required: false }],
  members: [{ type: Schema.Types.ObjectId, ref: "User", required: false }],
});

const Topic = mongoose.model("Topic", topicSchema);

module.exports = Topic;
