const express = require("express");
const { getSiteSettings, updateSiteSettings } = require("../controllers/siteSettings.controller");

const router = express.Router();
router.get("/", getSiteSettings);
router.put("/", updateSiteSettings);
router.patch("/", updateSiteSettings);

module.exports = router;
