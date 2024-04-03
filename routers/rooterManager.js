const teamRoute = require("./teamRoute.js");
const roleRouter = require("./roleRouter.js");
const noteRouter = require("./noteRoute.js");
const aboutRouter = require("./aboutRoute.js");
const settingsRoute = require("./settingsRoute.js");
const authRoute = require("./authRoute.js");
const topicRoute = require("./topicRoute.js");
const adminRoute = require("./adminRoute.js");
const searchRouter = require("./searchRoute.js");

module.exports = function root(app) {
  app.use("/team", teamRoute);
  app.use("/role", roleRouter);
  app.use("/notes", noteRouter);
  app.use("/about", aboutRouter);
  app.use("/settings", settingsRoute);
  app.use("/auth", authRoute);
  app.use("/topic", topicRoute);
  app.use("/admin", adminRoute);
  app.use("/search", searchRouter);
};
