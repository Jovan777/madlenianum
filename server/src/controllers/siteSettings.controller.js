const asyncHandler = require("../utils/asyncHandler");
const SiteSettings = require("../models/SiteSettings");
const { getOrCreateSiteSettings, populateSiteSettings } = require("../services/siteSettings.service");
const { assignLocalizedPayload } = require("../services/localizedContent.service");

const getSiteSettings = asyncHandler(async (req, res) => {
  const existing = await getOrCreateSiteSettings();
  const item = await populateSiteSettings(SiteSettings.findById(existing._id));
  res.json({ success: true, item });
});

const updateSiteSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSiteSettings();
  assignLocalizedPayload(settings, { ...req.body, key: "default", updatedBy: req.admin?._id });
  await settings.save();
  const item = await populateSiteSettings(SiteSettings.findById(settings._id));
  res.json({ success: true, item });
});

module.exports = { getSiteSettings, updateSiteSettings };
