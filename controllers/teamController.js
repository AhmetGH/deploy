const Usermodel = require("../models/user");
const Rolemodel = require("../models/role");
const Teammodel = require("../models/team");
const notificationModel = require("../models/notification.js");

const io = require("socket.io")();

module.exports.getTeamMembers = async function (req, res) {
  try {
    const userId = req.user.id;

    const teamName = req.params.teamName;

    // const team = await Teammodel.findOne({ teamName, members: userId });

    // const isAdmin = await Usermodel.findById({ _id: userId }).populate("role");

    // if (isAdmin !== "admin") {
    //   if (!team) {
    //     return res.redirect("/forbidden");
    //   }
    // }

    const pageSize = parseInt(req.query.pageSize);

    const pageNumber = parseInt(req.query.pageNumber || 1);

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
    const filterStateInfo = req.query.stateName || "";

    const filter = { teamName };

    if (filterStateInfo === "active") {
      filter["members.isActive"] = true;
    } else if (filterStateInfo === "inactive") {
      filter["members.isActive"] = false;
    }

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
                "members._id": 1,
                "members.email": 1,
                "members.fullname": 1,
                "members.title": 1,
                "members.description": 1,
                "members.role.name": 1,
                "members.age": 1,
                "members.isActive": 1,
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
      key: item.members._id,
      fullname: item.members.fullname,
      age: item.members.age,
      role: item.members.role[0]?.name,
      email: item.members.email,
      title: item.members.title,
      state: item.members.isActive,
    }));
    res.status(200).json({
      totalRecords,
      members,
      searchTerm,
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.getTeams = async (req, res) => {
  try {
    const searchTerm = req.query.searchTerm || "";
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const pageSize = parseInt(req.query.pageSize);
    const userId = req.user.id; // Kullanıcının kimliğini al

    const user = await Usermodel.findById(userId).populate("role");
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    if (user.role.name === "admin") {
      const filter = {};

      if (searchTerm) {
        filter.$or = [{ teamName: { $regex: new RegExp(searchTerm, "i") } }];
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
            teamDescription: 1,
            memberCount: { $size: "$members" },
          },
        },
        sortStage,
        {
          $facet: {
            teams: [
              { $skip: (pageNumber - 1) * pageSize },
              { $limit: pageSize },
            ],
            totalRecords: [{ $count: "total" }],
          },
        },
      ];

      const result = await Teammodel.aggregate(pipeline);

      const totalRecords = result[0]?.totalRecords?.[0]?.total ?? 0;
      const teams = result[0]?.teams ?? [];
      const editedTeams = teams.map((team) => ({
        key: team._id,
        teamName: team.teamName,
        teamDescription: team.teamDescription,
        memberCount: team.memberCount,
      }));
      return res.status(200).json({
        totalRecords,
        editedTeams,
      });
    } else {
      const userTeams = await Teammodel.find({ members: userId });

      const userTeamIds = userTeams.map((team) => team._id);

      const filter = {
        _id: { $in: userTeamIds },
      };

      if (searchTerm) {
        filter.$or = [{ teamName: { $regex: new RegExp(searchTerm, "i") } }];
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
            teamDescription: 1,
            memberCount: { $size: "$members" },
          },
        },
        sortStage,
        {
          $facet: {
            teams: [
              { $skip: (pageNumber - 1) * pageSize },
              { $limit: pageSize },
            ],
            totalRecords: [{ $count: "total" }],
          },
        },
      ];

      const result = await Teammodel.aggregate(pipeline);

      const totalRecords = result[0]?.totalRecords?.[0]?.total ?? 0;
      const teams = result[0]?.teams ?? [];
      const editedTeams = teams.map((team) => ({
        key: team._id,
        teamName: team.teamName,
        teamDescription: team.teamDescription,
        memberCount: team.memberCount,
      }));
      return res.status(200).json({
        totalRecords,
        editedTeams,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Takımlar alınırken bir hata oluştu" });
  }
};

module.exports.getTeamNames = async (req, res) => {
  try {
    const allTeams = await Teammodel.find({});
    res.json({ allTeams });
  } catch (error) {
    return res.status(400).json(error);
  }
};
module.exports.setTeamOnlyMembers = async (req, res) => {
  const userId = req.user.id;

  const teamId = req.body;

  try {
    const promises = teamId.map(async (item) => {
      const members = await Usermodel.find({ team: item.toString() }).populate(
        "team"
      );
      return members;
    });

    const teamMembers = await Promise.all(promises);

    const allMembers = teamMembers.flat(); // Tüm üyeleri tek bir diziye topla

    const usersNotInTeamOnlyMember = await Usermodel.find({
      _id: { $nin: allMembers.map((user) => user._id) },
    }).populate("team");
    const filteredMembers = usersNotInTeamOnlyMember.filter(
      (member) => member._id != userId
    );

    return res.status(200).json({ filteredMembers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(400).json(error);
  }
};

module.exports.createTeam = async (req, res, io) => {
  const { teamName, teamDescription } = req.body;

  try {
    const hasTeam = await Teammodel.findOne({ teamName: teamName });

    if (hasTeam) {
      return res.status(400).json({
        message: "Team addition unsuccessful.",
        description: "The team already exists.",
      });
    }

    const yeniTakim = new Teammodel({
      teamName: teamName,
      teamDescription: teamDescription,
    });

    await yeniTakim.save();

    io.emit("teamCreated", teamName); // Emit the event

    return res.status(200).json({
      message: "Team addition Successful.",
      description: "The team addition process was completed successfully.",
    });
  } catch (error) {}
};

module.exports.createTeamMember = async (req, res, io) => {
  try {
    const myUserId = req.user.id;
    const teamName = req.params.teamName;
    const userIds = req.body;

    const userName = await Usermodel.findById(myUserId).populate("fullname");

    const team = await Teammodel.findOne({ teamName });

    if (!team) {
      return res.status(400).json({
        message: "Member addition unsuccessful.",
        description: "Team not found .",
      });
    }

    await Usermodel.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { team: team._id } }
    );

    team.members.push(...userIds);

    userIds.forEach(async (userId) => {
      const notification = new notificationModel({
        userId: userId,
        message: `${userName.fullname} , sizi ${team.teamName} adlı takıma ekledi.`,
        fullname: userName.fullname,
        teamName: team.teamName,
        type: "team",
        url: `/teamMates/${team.teamName}`,
      });
      await notification.save();
      io.emit("notification", notification);
    });

    await team.save();
    io.emit("teamMemberCreated");

    return res.status(200).json({
      teamName: ` ${teamName}`,
      description: "",
    });
  } catch (error) {
    return res.status(400).json({
      message: error,
      description: "",
    });
  }
};

module.exports.updateTeamMember = async function (req, res, io) {
  try {
    const role = await Rolemodel.findOne({ name: req.body.role });
    if (!role) {
      return res.status(404).json({
        message: "The user could not be updated.",
        description: "Role not found .", // bu açıklamayı değiştirirsen front-end deki çeviri bozulacaktır.
      }); //değiştirmeden önce kontrol et
    }
    const { email, fullname, title, age, state, key } = req.body;

    const updatedStudent = await Usermodel.findByIdAndUpdate(
      key,
      {
        email: email,
        fullname: fullname,
        role: role._id,
        title: title,
        age: age,
        isActive: state,
      },
      { new: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({
        message: "The user could not be updated.",
        description: "User not found .",
      });
    }

    io.emit("teamMemberUpdated");

    res.status(200).json({
      message: "Kullanıcı güncellendi",
      descripton: "",
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.updateTeam = async function (req, res, io) {
  try {
    const { teamName, teamDescription, key } = req.body;

    const team = await Teammodel.findByIdAndUpdate(
      key,
      {
        teamName: teamName,
        teamDescription: teamDescription,
      },
      { new: true }
    );

    if (!team) {
      return res.status(404).json({
        message: "Team not updated",
        description: "Team not Found",
      });
    }

    io.emit("teamUpdated");

    return res.status(200).json({
      message: "Takım güncelleme başarılı!",
      description: "",
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.deleteTeams = async function (req, res, io) {
  // Accept io instance as parameter
  try {
    const teamIds = req.body.teamIds;

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ message: "Geçersiz kullanıcı kimlikleri" });
    }

    await Usermodel.updateMany(
      { team: { $in: teamIds } },
      { $pull: { team: { $in: teamIds } } }
    );

    const result = await Teammodel.deleteMany({ _id: { $in: teamIds } });
    io.emit("teamDeleted", teamIds); // Emit the event

    res.status(200).json({
      message: "Takım silme başarılı",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ message: "İç sunucu hatası" });
  }
};

module.exports.allMembers = async function (req, res) {
  try {
    const teamName = req.params.teamName;
    const members = await Teammodel.findOne({ teamName }).populate({
      path: "members",
      select: "-_id email",
    });
    if (!members) return res.status(400).json();

    return res.status(200).json(members);
  } catch (error) {
    return res.status(400).json({
      message: error,
      description: "",
    });
  }
};

module.exports.removeTeamMember = async (req, res, io) => {
  try {
    const teamName = req.params.teamName;
    const { userIds } = req.body;

    const team = await Teammodel.findOne({ teamName });

    if (!team) {
      return res.status(400).json({
        message: "Takım bulunamadı",
        description: "",
      });
    }

    team.members = team.members.filter(
      (member) => !userIds.includes(member.toString())
    );
    await team.save();

    await Usermodel.updateMany(
      { _id: { $in: userIds } },
      { $pull: { team: team._id } }
    );
    io.emit("teamMemberRemoved");

    return res.status(200).json({
      message: "Kullanıcılar takımdan başarıyla çıkarıldı",
      description: "",
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      description: "",
    });
  }
};
