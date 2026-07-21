const SiteSettings = require("../models/SiteSettings");

const populateSiteSettings = (query) => query
  .populate("mainLogo")
  .populate("footerLogo")
  .populate("partnerLogos.media")
  .populate("socialImage");

const getOrCreateSiteSettings = async () => {
  let settings = await SiteSettings.findOne({ key: "default" });
  if (!settings) settings = await SiteSettings.create({ key: "default", languages: ["sr"] });
  return settings;
};

module.exports = { getOrCreateSiteSettings, populateSiteSettings };
