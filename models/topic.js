const mongoose = require('../db/db.js')
const Schema = mongoose.Schema;


const topicSchema = new Schema({

    topicName: {
        type: String,
        required: true,
        unique: false
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    underElement: {
        type: Boolean,
        required: true,
        unique: false
    },
    children: [{
        type: Schema.Types.ObjectId,
        ref: 'Topic',
        required:false
    }],
    access: {               //4 rol
        type: String,
        required: true,
        unique: false
    },
    edit: {               //3 rol
        type: String,
        required: true,
        unique: false
    },
    post: [{ type: Schema.Types.ObjectId, ref: 'Note', required: false }],
    members: [{ type: Schema.Types.ObjectId, ref: 'User', required: false }]
});

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;
