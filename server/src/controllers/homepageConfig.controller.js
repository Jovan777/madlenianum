const asyncHandler = require("../utils/asyncHandler");
const HomepageConfig = require("../models/HomepageConfig");
const { getOrCreateHomepageConfig, getResolvedHomepage, populateHomepageConfig } = require("../services/homepage.service");

const getHomepageConfig = asyncHandler(async (req, res) => {
  const existing = await getOrCreateHomepageConfig();
  const item = await populateHomepageConfig(HomepageConfig.findById(existing._id));
  res.json({ success: true, item });
});

const updateHomepageConfig = asyncHandler(async (req, res) => {
  const config = await getOrCreateHomepageConfig();
  Object.assign(config, req.body, { key: "default", updatedBy: req.admin?._id });
  await config.save();
  const item = await populateHomepageConfig(HomepageConfig.findById(config._id));
  res.json({ success: true, item });
});

const previewHomepage = asyncHandler(async (req, res) => {
  const data = await getResolvedHomepage();
  res.json({ success: true, preview: true, robots: "noindex,nofollow", ...data });
});

module.exports = { getHomepageConfig, previewHomepage, updateHomepageConfig };
