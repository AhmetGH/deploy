var mongoose = require("mongoose")


var connection = "mongodb+srv://ahmetgocmen07:9Jzm8XKwMxHKr8m1@ahmet.shuruci.mongodb.net/?retryWrites=true&w=majority&appName=ahmet"


mongoose.connect(connection)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

module.exports =mongoose