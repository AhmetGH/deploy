const express = require('express');
var jwt = require('jsonwebtoken');
const app = express();

const cors = require('cors')
app.use(cors());
app.use(express.json())
const PORT = 3000

const Usermodel = require('./models/user')
const Rolemodel = require('./models/role')
const Teammodel = require('./models/team')
const NoteModel = require('./models/note.js')

require("dotenv").config();

const authMiddleware = require('./middlewares.js');

app.listen(
  PORT,
  () => console.log(`calisti http://localhost:${PORT}`)
)

app.post('/team/:teamName/member', async (req, res) => {
  const teamName = req.params.teamName;
  const {  email, role } = req.body;
  console.log(email)
  console.log(role)

  try {
    // Takımı bul
    const team = await Teammodel.findOne({ teamName });
    if (!team) {
      return res.status(404).json({ message: 'Takım bulunamadı' });
    }

    // Kullanıcıyı bul
    const user = await Usermodel.findOne( {email : email} );
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Rolü bul
    const rol = await Rolemodel.findOne({ name: role });
    if (!rol) {
      return res.status(404).json({ message: 'Rol bulunamadı' });
    }

    const isMemberInTeam = team.members.includes(user._id);
    if (isMemberInTeam) {
      return res.status(400).json({ message: 'Kullanıcı zaten bu takımda bulunuyor' });
    }

    // Kullanıcıyı takıma ekle
    user.role = rol._id;
    user.team.push(team._id);
    await user.save();

    // Takıma kullanıcıyı ekle
    team.members.push(user._id);
    await team.save();

    res.status(201).json({ message: 'Kullanıcı başarıyla takıma eklendi', user: user });
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcı takıma eklenirken bir hata oluştu', error: error.message });
  }
});



app.get('/team/:teamName', async (req, res) => {
  const teamName = req.params.teamName;
  console.log(teamName)

  try {
      

        const team = await Teammodel.findOne({ teamName })
            .populate({
                path: 'members',
                select: 'email fullname',
                
                populate: { path: 'role', select: 'name' } // İç içe populate işlemi ile rollerin sadece adını alırız
            })
            .select('-_id members') // İstenmeyen alanları seçmemek için kullanılır
            .exec();


      if (!team) {
          return res.status(404).json({ message: 'Takım bulunamadı' });
      }
      console.log(team)
      res.status(200).json( team );
  } catch (error) {
      res.status(500).json({ message: 'Takım bilgileri getirilirken hata oluştu', error: error.message });
  }
});

app.get('/team', async (req, res) => {
  try {
    // Tüm takımları veritabanından çek
    const teams = await Teammodel.find();
    
    // Takımları JSON formatında yanıt olarak gönder
    res.status(200).json(teams);
  } catch (error) {
    // Hata durumunda uygun yanıtı gönder
    res.status(500).json({ message: 'Takımlar alınamadı', error: error.message });
  }
});

app.post('/team', async (req, res) => {
  const { teamName, description , userEmail , userRol } = req.body;
  try {
    
    const hasTeam = await Teammodel.findOne({ teamName : teamName }) 
  
    // Yeni bir takım oluştur
    

    if(hasTeam)
    {
        return res.status(400).json('Team already exists.');
    }
 

    const yeniTakim = new Teammodel({ 
      teamName, 
      description
    });


    // Yeni takımı veritabanına kaydet
    await yeniTakim.save();

    const member = await Usermodel.findOne({ email: userEmail });

    if (!member) {
      throw new Error('user bulunamadı');
    }

    const rol = await Rolemodel.findOne({name : userRol})

    if (!rol) {
      throw new Error('rol bulunamadı');
    }

    member.role = rol._id;
    member.team.push(yeniTakim._id)
    await member.save();

    yeniTakim.members.push(member._id)
    await yeniTakim.save();

   

    res.status(200).json({ takim: yeniTakim });
  } catch (error) {
    res.status(500).json({ mesaj: 'Takım oluşturulurken hata oluştu', hata: error.message });
  }
});


app.put('/members/:id', async (req, res) => {
  const memberId = req.params.id;
  const updatedMember = req.body; // Düzenlenmiş üye bilgisi
  console.log(memberId)
  console.log(updatedMember)

  try {
    // Üye bilgisini güncelle
    const member = await Usermodel.findByIdAndUpdate(memberId, updatedMember, { new: true });

    if (!member) {
      return res.status(404).json({ message: 'Üye bulunamadı' });
    }

    res.status(200).json({ message: 'Üye başarıyla güncellendi', member });
  } catch (error) {
    res.status(500).json({ message: 'Üye güncellenirken bir hata oluştu', error: error.message });
  }
});






app.post("/roles", async (req, res) => {
  try{
      const {name , description} = req.body
      const newRole = new Rolemodel({
        name: name,
        description: description,
      });


    const savedRole = await newRole.save();

    res.status(201).json(savedRole);
  } catch (error) {
      console.error('Rol ekleme hatası:', erfror);
      res.status(500).json({ error: 'Rol eklenemedi' });
  }
})

// Rol bilgilerini getirme endpoint'i
app.get('/roles', async (req, res) => {
  try {
      // Tüm rolleri MongoDB'den getir
      const roles = await Rolemodel.find();
      
      res.status(200).json(roles);
  } catch (error) {
      console.error('Roller getirme hatası:', error);
      res.status(500).json({ error: 'Roller getirilemedi' });
  }
});


app.post('/user/register', async (req, res) => {
  try {
      
      const { email, password, role } = req.body;

     
      const foundRole = await Rolemodel.findOne({ name: role });
      if (!foundRole) {
          return res.status(400).json({ error: 'Belirtilen rol bulunamadı' });
      }

    
    
      const newUser = new Usermodel({
          email: email,
          password: password,
          role: foundRole._id // Role belgesine referans
      });

      
      const savedUser = await newUser.save();

      res.status(201).json(savedUser);
  } catch (error) {
      console.error('Kullanıcı kaydı oluşturma hatası:', error);
      res.status(500).json({ error: 'Kullanıcı kaydı oluşturulamadı' });
  }
});


app.post('/savenote',authMiddleware, async (req, res) => {
  try {
    console.log(1)
    console.log(req.user.id)
    const userId=req.user.id;
    const user = await Usermodel.findById(userId).populate('note', 'noteName description');
 
    
    const newNote = new NoteModel({
        noteName : req.body.noteName,
        description: req.body.note
    });
    console.log(6)
    console.log(req.body.note)
    const savedNote = await newNote.save();
    console.log(7)
    console.log(savedNote)

    console.log("Not kaydedildi");

    res.status(201).json({ message: "Not kaydedildi" });
} catch (error) {
    console.error("Not kaydedilemedi", error);
    res.status(500).json({ message: "Not kaydedilemedi" });
}
});



app.get('/users', async (req, res) => {
  try {
      const users = await Usermodel.find().populate('role', 'name');
   
      const usersWithRoleNames = users.map(user => ({
          email: user.email,
          role: user.role ? user.role.name : null 
      }));
      console.log(usersWithRoleNames);

      res.status(200).json(usersWithRoleNames);
  } catch (error) {
      console.error('Kullanıcılar getirme hatası:', error);
      res.status(500).json({ error: 'Kullanıcılar getirilemedi' });
  }
});

app.get("/notes", async (req, res) => {
  try {
    const allnotes = await NoteModel.find({});
    res.json(allnotes)
  } catch (error) {
    return res.status(400).json(error);
  }
})

app.post("/login", async (req, res) => {
  try {
    const {email, password } = req.body;

    const userFound = await Usermodel.findOne({email: email, password: password }).populate('role', 'name');;
    const role=userFound.role.name
    if (userFound) {
      console.log(`Kullanıcı Doğrulandı`);
      const accessToken = jwt.sign(
        { id:userFound.id},
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "100s" })

      const refreshToken = jwt.sign(
        { id:userFound.id},
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "300s" });

      return res.status(200).json({ accessToken, refreshToken ,role});
    } else {
      return res.status(401).json({ message: "Bilgiler geçersiz." });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});



app.post('/admin/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    const hasUser = await Usermodel.findOne({ email: email });

    if (hasUser) {
      
      return res.status(400).json('User already exists.');
    }
    const foundRole = await Rolemodel.findOne({ name: "admin" });

    const newUser = new Usermodel({
      email: email,
      password: password,
      role: foundRole._id
    });

  
    const savedUser = await newUser.save();


    return res.status(200).json(savedUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  console.log("eski refreshToken : " + refreshToken)
  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, data) => {
    if (err) {
      console.log(err);
      return res.status(400).json(err);
    }
    const accessToken = jwt.sign(
      { id:data.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "100s" });

    const refreshToken = jwt.sign(
      { id:data.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "300s" });

    console.log("yeni refreshToken : " + refreshToken + "\n")

    return res.status(200).json({ accessToken, refreshToken });
  });
})

app.get("/auth", authMiddleware ,(req, res) => {
  return res.sendStatus(200);
});

app.get("/rol", authMiddleware, async(req, res) => {
  console.log(req.user)
  const user = await Usermodel.findById(req.user.id).populate('role');
  console.log(user.role.name)
  return res.json(user.role.name);
});
