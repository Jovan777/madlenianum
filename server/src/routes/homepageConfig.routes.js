const express = require("express");
const { getHomepageConfig, previewHomepage, updateHomepageConfig } = require("../controllers/homepageConfig.controller");

const router = express.Router();
router.get("/", getHomepageConfig);
router.put("/", updateHomepageConfig);
router.patch("/", updateHomepageConfig);
router.get("/preview", previewHomepage);

module.exports = router;
