const mongoose = require("../db/db.js");

const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  message: {
    type: String,
    required: false,
    unique: false,
  },
  fullname: {
    type: String,
    required: false,
    unique: false,
  },
  teamName: {
    type: String,
    required: false,
    unique: false,
  },
  type: {
    type: String,
    required: false,
    unique: false,
  },
  url: {
    type: String,
  },

  read: {
    type: Boolean,
    default: false,
  },
});

const notification = mongoose.model("notification", notificationSchema);

module.exports = notification;
