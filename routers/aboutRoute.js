var express = require("express")
var router = express.Router()
const Aboutmodel = require('../models/about')
const Usermodel = require("../models/user")
const authMiddleware = require('../middlewares');


router.get("/", authMiddleware, async (req, res) => {
    try {
        const allAbouts = await Aboutmodel.find({}).sort({ _id: -1 });
        res.status(200).json({ allAbouts: allAbouts, })
        console.log(allAbouts)
    } catch (error) {
        return res.status(400).json(error);
    }
})

router.post('/', authMiddleware, async (req, res) => {
    const { aboutName, description } = req.body;
    try {
        console.log(1)
        console.log("body  :", req.body)
        const hasAbout = await Aboutmodel.findOne({ aboutName })
        if (hasAbout) {
            res.status(409).json("Not zaten var")
        }

        const newAbout = new Aboutmodel({
            aboutName: aboutName,
            description: description
        });
        const savedAbout = await newAbout.save();
        console.log("saved note: ", savedAbout)
        res.status(201).json({ message: "Hakkında kaydedildi" });
    } catch (error) {
        console.error("Hakkında kaydedilemedi", error);
        res.status(500).json({ message: "Hakkında kaydedilemedi" });
    }
});


module.exports = router