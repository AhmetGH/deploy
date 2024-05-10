const mongoose = require("../db/db.js");
const Schema = mongoose.Schema;

const topicSchema = new Schema({
  topicName: {
    type: String,
    required: true,
    unique: false,
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: "Topic",
    required: false,
  },
    owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  underElement: {
    type: Boolean,
    required: true,
    unique: false,
  },
  children: [
    {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: false,
    },
  ],
  accessTeam: [
    {
      //4 rol
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: false,
    },
  ],
  accessUser: [
    {
      //4 rol
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  ],
  editTeam: [
    {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: false,
    },
  ],
  editUser: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  ],
  post: [{ type: Schema.Types.ObjectId, ref: "Note", required: false }],
  members: [{ type: Schema.Types.ObjectId, ref: "User", required: false }],
});

const Topic = mongoose.model("Topic", topicSchema);

module.exports = Topic;
