const userModel = require("../models/user");
const Rolemodel = require("../models/role");
module.exports.getUsers = async function (req, res) {
  try {
    const pageSize = 3;
    const pageNumber = parseInt(req.query.pageNumber || 1);

    const sortField = req.query.sortBy;
    const sortOrder = req.query.order || "asc";

    let sortOptions = {};

    if (sortField) {
      sortOptions[sortField] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions["_id"] = sortOrder === "desc" ? -1 : 1;
    }

    const searchTerm = req.query.searchTerm || "";
    const roleNames = req.query.roleName ? req.query.roleName.split(",") : [];
    const titles = req.query.title ? req.query.title.split(",") : [];

    const filter = {};

    if (searchTerm) {
      filter["fullname"] = { $regex: new RegExp(searchTerm, "i") };
    }

    if (roleNames.length > 0) {
      filter["role.name"] = { $in: roleNames };
    }
    if (titles.length > 0) {
      filter["title"] = { $in: titles };
    }

    const sortStage =
      Object.keys(sortOptions).length > 0 ? { $sort: sortOptions } : {};

    const pipeline = [
      {
        $lookup: {
          from: "roles",
          localField: "role",
          foreignField: "_id",
          as: "role",
        },
      },
      {
        $match: filter,
      },
      sortStage,
      {
        $facet: {
          filteredUsers: [
            { $skip: (pageNumber - 1) * pageSize },
            { $limit: pageSize },
            {
              $project: {
                _id: 1,
                email: 1,
                fullname: 1,
                title: 1,
                description: 1,
                age: 1,
                "role.name": 1,
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

    const result = await userModel.aggregate(pipeline);

    const totalRecords = result[0]?.totalRecords?.[0]?.total ?? 0;
    const filteredUsers = result[0]?.filteredUsers ?? [];

    const users = filteredUsers.map((item) => ({
      // const role=await RoleModel.find({role:item.role})
      key: item._id,
      name: item.fullname,
      age: item.age,
      role: item.role[0]?.name,
      email: item.email,
      title: item.title,
    }));

    res.status(200).json({
      totalRecords,
      users,
      searchTerm,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "İç sunucu hatası" });
  }
};

module.exports.deleteUsers = async function (req, res) {
  try {
    const userIds = req.body.userIds;
    console.log("userIds:", userIds, "body:", req);
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Geçersiz kullanıcı kimlikleri" });
    }
    const result = await userModel.deleteMany({ _id: { $in: userIds } });

    res.status(200).json({
      message: "Kullanıcılar başarıyla silindi",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "İç sunucu hatası" });
  }
};

module.exports.createUser = async (req, res) => {
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
