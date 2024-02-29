var mongoose = require("mongoose")


var connection = "mongodb://localhost:27017/knowledgedb"


mongoose.connect(connection)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

module.exports =mongoose