const express = require('express');
var jwt =require('jsonwebtoken');
const app = express();
const cors = require('cors')
app.use(cors());
app.use(express.json())
const PORT = 3000
const Usermodel = require('./models/user')
require("dotenv").config();

const authMiddleware = require('./middlewares.js');


const server = app.listen(
  PORT,
  () => console.log(`calisti http://localhost:${PORT}`)
)


app.get("/users", (req, res) => {
    Usermodel.find({}).then(function (users) {
      res.json(users)
      console.log(users)
    }).catch(function (err) {
      console.log(err)
    })
  })

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userFound = await Usermodel.findOne({ email: email, password: password });
    if (userFound) {

      console.log(`Kullanıcı Doğrulandı`);
      const accessToken =jwt.sign(
        {email:userFound.email,password: userFound.password},
         process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:"300s"})
  
        const refreshToken =jwt.sign(
          {email:userFound.email,password: userFound.password},
           process.env.REFRESH_TOKEN_SECRET)

      return res.status(200).json({accessToken, refreshToken});
    } else {
      return res.status(401).json({message: "Bilgiler geçersiz."});
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.get("/auth",authMiddleware,(req,res)=>{
  return res.sendStatus(200);
});
