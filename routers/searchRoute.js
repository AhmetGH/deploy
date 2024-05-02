const express = require("express");
const router = express.Router();
var searchController = require("../controllers/searchController");
const authMiddleware = require("../middlewares");

router.use(express.json());

router.post("/transferData", searchController.transferDataToElasticSearch);

router.get("/autocomplete", authMiddleware,searchController.searchSuggestions);

module.exports = router;
