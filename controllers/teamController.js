const Usermodel = require("../models/user");
const Rolemodel = require("../models/role");
const Teammodel = require("../models/team");

module.exports.getTeamMates = async (req, res) => {
  const teamName = req.params.teamName;

  try {
    const team = await Teammodel.findOne({ teamName: teamName })
      .populate({
        path: "members",
        select: "email fullname title description",
        populate: { path: "role", select: "name" },
      })
      .select("-_id members")
      .exec();

    if (!team) {
      return res.status(404).json({ message: "Takım bulunamadı" });
    }
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({
      message: " Takım bilgileri getirilirken hata oluştu !",
      error: error.message,
    });
  }
};

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
    const members = filteredMembers.map((item) => ({
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

module.exports.getTeamsWithPagination = async (req, res) => {
  try {
    const searchTerm = req.query.searchTerm || "";
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const pageSize = 3;

    const filter = {};

    if (searchTerm) {
      filter.$or = [
        { teamName: { $regex: new RegExp(searchTerm, "i") } },
        // { description: { $regex: new RegExp(searchTerm, "i") } }
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
          as: "members",
        },
      },
      {
        $match: filter,
      },
      sortStage,
      {
        $project: {
          teamName: 1,
          description: 1,
          memberCount: { $size: "$members" },
        },
      },
      sortStage, // Sıralama aşamasını pipeline'a ekle
      {
        $facet: {
          teams: [{ $skip: (pageNumber - 1) * pageSize }, { $limit: pageSize }],
          totalRecords: [{ $count: "total" }],
        },
      },
    ];

    const result = await Teammodel.aggregate(pipeline);

    const totalRecords = result[0]?.totalRecords?.[0]?.total ?? 0;
    const teams = result[0]?.teams ?? [];
    const editedTeams = teams.map((item) => ({
      key: item._id,
      teamName: item.teamName,
      description: item.description,
      memberCount: item.memberCount,
    }));
    res.status(200).json({
      totalRecords,
      editedTeams,
    });
  } catch (error) {
    res.status(500).json({ message: "Takımlar alınırken bir hata oluştu" });
  }
};

module.exports.postTeam = async (req, res) => {
  const { teamName, description } = req.body;

  try {
    const hasTeam = await Teammodel.findOne({ teamName: teamName });

    if (hasTeam) {
      return res.status(400).json({
        message: "Takım zaten var",
        description: "",
      });
    }

    const yeniTakim = new Teammodel({
      teamName: teamName,
      description: description,
    });

    await yeniTakim.save();

    return res.status(200).json({
      message: "Takım ekleme başarılı!",
      description: " ",
    });
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

module.exports.updateTeam = async function (req, res) {
  try {
    const { teamName, description, key } = req.body;

    const team = await Teammodel.findByIdAndUpdate(
      key,
      {
        teamName: teamName,
        description: description,
      },
      { new: true }
    );

    if (!team) {
      return res.status(404).json({ message: "Takım güncellenmedi" });
    }

    return res.status(200).json({
      message: "Takım güncelleme başarılı!",
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.deleteTeams = async function (req, res) {
  try {
    const teamIds = req.body.teamIds;
    console.log("teamIds:", teamIds, "body:", req);
    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ message: "Geçersiz kullanıcı kimlikleri" });
    }
    const result = await Teammodel.deleteMany({ _id: { $in: teamIds } });

    res.status(200).json({
      message: "Kullanıcılar başarıyla silindi",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "İç sunucu hatası" });
  }
};
