const Usermodel = require("../models/user");
const Rolemodel = require("../models/role");
const Teammodel = require("../models/team");

// module.exports.getTeamMates = async (req, res) => {
//   const teamName = req.params.teamName;

//   try {
//     const team = await Teammodel.findOne({ teamName: teamName })
//       .populate({
//         path: "members",
//         select: "email fullname title description",
//         populate: { path: "role", select: "name" },
//       })
//       .select("-_id members")
//       .exec();

//     if (!team) {
//       return res.status(404).json({ message: "Takım bulunamadı" });
//     }
//     res.status(200).json(team);
//   } catch (error) {
//     res.status(500).json({
//       message: " Takım bilgileri getirilirken hata oluştu !",
//       error: error.message,
//     });
//   }
// };

module.exports.getTeamMatesWithPagination = async function (req, res) {
  try {
    const pageSize = 3;
    const pageNumber = parseInt(req.query.pageNumber || 1);
    const teamName = req.params.teamName;

    const sortField = req.query.sortBy;
    const sortOrder = req.query.order || "asc";
    let sortOptions = {};

    if (sortField) {
      sortOptions[sortField] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions["members._id"] = sortOrder === "desc" ? -1 : 1;
    }

    const searchTerm = req.query.searchTerm || "";
    const roleNames = req.query.roleName ? req.query.roleName.split(",") : [];
    const titles = req.query.title ? req.query.title.split(",") : [];

    const filter = { teamName };

    if (searchTerm) {
      filter["members.fullname"] = { $regex: new RegExp(searchTerm, "i") };
    }

    if (roleNames.length > 0) {
      filter["members.role.name"] = { $in: roleNames };
    }

    if (titles.length > 0) {
      filter["members.title"] = { $in: titles };
    }

    const sortStage =
      Object.keys(sortOptions).length > 0 ? { $sort: sortOptions } : {};

    const pipeline = [
      {
        $lookup: {
          from: "users",
          let: { memberId: "$members" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$memberId"] },
              },
            },
            {
              $lookup: {
                from: "roles",
                localField: "role",
                foreignField: "_id",
                as: "role",
              },
            },
          ],
          as: "members",
        },
      },
      {
        $unwind: "$members",
      },
      {
        $match: filter,
      },
      sortStage,
      {
        $facet: {
          filteredMembers: [
            { $skip: (pageNumber - 1) * pageSize },
            { $limit: pageSize },
            {
              $project: {
                "members.email": 1,
                "members.fullname": 1,
                "members.title": 1,
                "members.description": 1,
                "members.role.name": 1,
                "members.age": 1,
              },
            },
          ],
          totalRecords: [
            {
              $count: "total",
            },
          ],
        },
      },
    ];

    const result = await Teammodel.aggregate(pipeline);

    const totalRecords = result[0]?.totalRecords?.[0]?.total ?? 0;
    const filteredMembers = result[0]?.filteredMembers ?? [];
    const members= filteredMembers.map((item) => ({
      // const role=await RoleModel.find({role:item.role})
       key: item._id,
       teamName: item.teamName,
       description: item.description,
      
  
    
 }));
    res.status(200).json({
      totalRecords,
      members,
    });
  } catch (err) {
    res.status(500).json(err);
  }
};


module.exports.getTeams = async (req, res) => {
  try {
    const searchTerm = req.query.searchTerm || "";
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const pageSize = 3;

    const filter = {};

    if (searchTerm) {
      filter.$or = [
        { teamName: { $regex: new RegExp(searchTerm, "i") } },
        { description: { $regex: new RegExp(searchTerm, "i") } }
      ];
    }

    const sortField = req.query.sortBy;
    const sortOrder = req.query.order || "asc";

    let sortOptions = {};

    if (sortField) {
      sortOptions[sortField] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions["_id"] = sortOrder === "desc" ? -1 : 1;
    }

    const sortStage =
    Object.keys(sortOptions).length > 0 ? { $sort: sortOptions } : {};

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "members"
        }
      },
      {
        $match: filter,
      },
      sortStage,
      {
        $project: {
          teamName: 1,
          description: 1,
          memberCount: { $size: "$members" }
        }
      },
      sortStage, // Sıralama aşamasını pipeline'a ekle
      {
        $facet: {
          teams: [
            { $skip: (pageNumber - 1) * pageSize },
            { $limit: pageSize }
          ],
          totalRecords: [
            { $count: "total" }
          ]
        }
      }
    ];

    const result = await Teammodel.aggregate(pipeline);

    const totalRecords = result[0]?.totalRecords?.[0]?.total ?? 0;
    const teams = result[0]?.teams ?? [];

    res.status(200).json({
      totalRecords,
      teams
    });
  } catch (error) {
    res.status(500).json({ message: "Takımlar alınırken bir hata oluştu" });
  }
};








// module.exports.getTeams = async (req, res) => {
//   try {
//     const teams = await Teammodel.find();
//     res.status(200).json(teams);
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Takımlar alınmadı", error: error.message });
//   }
// };

module.exports.postTeam = async (req, res) => {
  const { teamName, description, userEmail, userRol } = req.body;

  try {
    const hasTeam = await Teammodel.findOne({ teamName });

    if (hasTeam) {
      return res.status(400).json("Takım zaten var");
    }

    const yeniTakim = new Teammodel({
      teamName,
      description,
    });

    await yeniTakim.save();

    const member = await Usermodel.findOne({ email: userEmail });

    if (!member) {
      throw new Error("user bulunamadı");
    }

    const rol = await Rolemodel.findOne({ name: userRol });

    if (!rol) {
      throw new Error("rol bulunamadı");
    }

    member.role = rol._id;
    member.team.push(yeniTakim._id);
    await member.save();

    yeniTakim.members.push(member._id);
    await yeniTakim.save();
    res.sendStatus(200);
  } catch (error) {}
};

module.exports.postTeamMember = async (req, res) => {
  try {
    const teamName = req.params.teamName;
    const { email, role } = req.body;

    const team = await Teammodel.findOne({ teamName });
    if (!team) {
      return res.status(404).json({ message: "Takım bulunamadı" });
    }

    // Kullanıcıyı bul
    const user = await Usermodel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    //rolu bul
    const roleObject = await Rolemodel.findOne({ name: role });
    if (!roleObject) {
      return res.status(404).json({ message: "Rol bulunamadı" });
    }

    // Kullanıcının takımda olup olmadığını kontrol et
    if (team.members.includes(user._id)) {
      return res
        .status(400)
        .json({ message: "Kullanıcı zaten bu takımda bulunuyor" });
    }

    // Kullanıcıya rol ve takım bilgilerini ata
    user.role = roleObject._id;
    user.team.push(team._id);
    await user.save();

    // Takıma kullanıcıyı ekle
    team.members.push(user._id);
    await team.save();

    return res
      .status(201)
      .json({ message: "Kullanıcı başarıyla takıma eklendi", user });
  } catch (error) {
    return res.status(500).json({
      message: "Kullanıcı takıma eklenirken bir hata oluştu",
      error: error.message,
    });
  }
};

module.exports.putMember = async function (req, res) {
  const memberId = req.params.id;
  const updatedMember = req.body; // Düzenlenmiş üye bilgisi

  try {
    // Üye bilgisini güncelle
    const member = await Usermodel.findByIdAndUpdate(memberId, updatedMember, {
      new: true,
    });

    if (!member) {
      return res.status(404).json({ message: "Üye bulunamadı" });
    }

    res.status(200).json({ message: "Üye başarıyla güncellendi", member });
  } catch (error) {
    res.status(500).json({
      message: "Üye güncellenirken bir hata oluştu",
      error: error.message,
    });
  }
};
