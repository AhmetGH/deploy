
const membersRoute = require("./membersRoute.js")
const teamRoute = require("./teamRoute.js")
const roleRouter = require("./roleRouter.js")
const noteRouter = require("./noteRoute.js")
const aboutRouter = require("./aboutRoute.js")
const settingsRoute = require("./settingsRoute.js")
const authRoute =  require("./authRoute.js")
const topicRoute = require("./topicRoute.js")




module.exports = function root(app) {

    app.use("/team", teamRoute)
    app.use("/members", membersRoute)
    app.use("/roles", roleRouter)
    app.use("/notes", noteRouter)
    app.use("/about", aboutRouter)
    app.use("/settings", settingsRoute)
    app.use("/auth" , authRoute)

    app.use("/topic", topicRoute)

}



