const mongoose = require('../db/db.js')


const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
});
 

const User = mongoose.model('User', userSchema);

const newUser = new User({
  email: 'a@mail.com',
  password: '123abc',
});
 
newUser.save()
  .then(() => {
    console.log('Kullanıcı başarıyla eklendi.');
  })
  .catch((err) => {
    console.error('Kullanıcı eklenirken hata oluştu:', err);
  });

  module.exports = User;