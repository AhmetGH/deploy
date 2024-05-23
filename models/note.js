const mongoose = require("../db/db.js");
const Schema = mongoose.Schema;

const noteSchema = new Schema({
  noteName: {
    type: String,
    required: true,
    unique: false,
  },
  description: {
    type: String,
    required: false,
    unique: false,
  },
  isPublic: {
    type: Boolean,
    required: false,
    unique: false,
  },
  operationDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  readingTime: {
    type: Number,
    required: false,
    unique: false,
  },
  accessTeam: [
    {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: false,
    },
  ],
  accessUser: [
    {
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
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  members: [{ type: Schema.Types.ObjectId, ref: "User", required: false }],
});

noteSchema.index({ owner: 1 });
noteSchema.index({ noteName: 1 });
noteSchema.index({ operationDate: -1 });
noteSchema.index({ accessTeam: 1 });
noteSchema.index({ accessUser: 1 });

const Note = mongoose.model("Note", noteSchema);

module.exports = Note;
