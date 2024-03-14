const express = require("express")
const router = express.Router();

const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const userModel = require("../models/user")
const sendEmail = require("../utils/sendEmail")
const roleModel = require("../models/role")


router.post("/admin/register", async (req, res) => {
  try {
    
    const { email, password } = req.body;

    const hasUser = await userModel.findOne({ email: email });

    if (hasUser) {
      return res.status(400).json("User already exists.");
    }
    const getRole = await roleModel.findOne({name:"admin"});
    console.log(getRole._id)
    

    const hashedPassword = await bcrypt.hash(password, 10);
      

    const newUser = new userModel({
      email: email,
      password: hashedPassword,
      role: getRole._id
    });

    const savedUser = await newUser.save();

    return res.status(200).json(savedUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/register" ,async (req,res) => {

    try {
        const { email } = req.body;
        const user = await userModel.findOne({email})
        const getRole = await roleModel.findOne({name:"user"});

        if(user)
          return res.status(400).send("user already exists")

        const newUser = new userModel({email , role : getRole._id});
        await newUser.save();
        
        const token = jwt.sign({userId : newUser._id},process.env.EMAIL_SECRET,{expiresIn :"15d"});

        newUser.emailToken = token;
        await newUser.save();
        
        const url = `http://localhost:3000/auth/verify?token=${token}`;
        await sendEmail(email , "Şifrenizi belirlemek için bağlantıya tıklayınız." , url);
        
        res.sendStatus(200);

    } catch (error) {
        res.status(500).send('Bir hata oluştu.');       
    }

});


router.get('/verify', async (req, res) => {
    try {
      console.log("verify ")
      const { token } = req.query;
  
      const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
  
      const user = await userModel.findOne({ _id: decoded.userId, emailToken: token });
      if (!user) {
        return res.status(400).send('Geçersiz token.');
      }
      
      res.redirect(`http://localhost:4000/auth/reset-password/${token}`);
    } catch (error) {
      res.status(500).send('Bir hata oluştu.');
    }
  });



router.post("/set-password" , async(req,res)=>{
    
    try {
        const { password , token } = req.body;
        console.log("pass" );
        console.log(password );
        console.log(token );

        const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
        const user = await userModel.findOne({ _id: decoded.userId, emailToken: token });
        if (!user) {
          return res.status(400).send('Geçersiz token.');
        }
        console.log(user)
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.emailToken = undefined; 
        user.isActive = true
        await user.save();
    
        res.redirect('http://localhost:4000/login');
      } catch (error) {
        res.status(500).send({error});
      }
});


router.post("/forgot-password" , async(req,res) => {
  try {
    const {email} = req.body;
    const User = await userModel.findOne({email});
    if(!User)
      return res.send({message_header : "Geçersiz mail adresi!",message:"Girmiş olduğunuz e-mail adresinin sistemde kaydı bulunmamaktadır!"});

    const token = jwt.sign({userId : User._id} ,process.env.EMAIL_SECRET, {expiresIn :"15d"});
    
    const Url = `http://localhost:3000/auth/verify-forget?token=${token}`

    await sendEmail(email , "Şifre sıfırlama" ,Url )

    res.status(200).json({ message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' });
    //işlem tamamlandı sayfasına yönlendir
  } catch (error) {
    res.status(500).json(error);
    
  }
})

router.get('/verify-forget', async (req, res) => {
  try {
    
    const  token  = req.query.token;
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);


    const user = await userModel.findOne({ _id: decoded.userId});
    if (!user) {
      return res.status(400).send('Geçersiz token.');
    } 
    res.redirect(`http://localhost:4000/auth/reset-password/${token}`);
  } catch (error) {
    res.status(500).send(error);
  }
});




router.post("/reset-password" , async (req,res)=>{
 
  try {
    const {password , token } = req.body;

    const decoded = jwt.verify(token , process.env.EMAIL_SECRET)
    const user = await userModel.findOne({ _id: decoded.userId});
    if (!user) {
        return res.status(400).send('Geçersiz token.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.emailToken = undefined; 
    user.isActive = true
    await user.save();
    
    res.status(200).json("Şifre başarıyla sıfırlandı");
  } catch (error) {
      console.error(error);
      res.status(500).json(error);
  }

})
module.exports = router