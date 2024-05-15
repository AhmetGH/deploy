const NodeCache = require("node-cache");
const stdCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

module.exports = stdCache;
