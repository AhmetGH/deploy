const express = require("express");
const router = express.Router();
var searchController = require("../controllers/searchController");

router.use(express.json());

router.post("/transferData", searchController.transferDataToElasticSearch);

router.get("/autocomplete", searchController.searchSuggestions);

module.exports = router;
