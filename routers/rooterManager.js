const teamRoute = require("./teamRoute.js");
const roleRouter = require("./roleRouter.js");
const noteRouter = require("./noteRoute.js");
const settingsRoute = require("./settingsRoute.js");
const authRoute = require("./authRoute.js");
const topicRoute = require("./topicRoute.js");
const adminRoute = require("./adminRoute.js");
const searchRouter = require("./searchRoute.js");

module.exports = function root(app, io) {
  app.use("/team", teamRoute(io));
  app.use("/role", roleRouter);
  app.use("/notes", noteRouter(io));
  app.use("/settings", settingsRoute);
  app.use("/auth", authRoute);
  app.use("/topic", topicRoute(io));
  app.use("/admin", adminRoute);
  app.use("/search", searchRouter);
};
