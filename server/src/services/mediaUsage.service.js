const Production = require("../models/Production");
const Artist = require("../models/Artist");
const News = require("../models/News");
const PromoSlide = require("../models/PromoSlide");
const StaticPage = require("../models/StaticPage");
const Venue = require("../models/Venue");
const HomepageConfig = require("../models/HomepageConfig");
const SiteSettings = require("../models/SiteSettings");

const usageChecks = [
  { resourceType: "Production", Model: Production, titleField: "title", field: "poster" },
  { resourceType: "Production", Model: Production, titleField: "title", field: "gallery" },
  { resourceType: "Production", Model: Production, titleField: "title", field: "galleryItems.media" },
  { resourceType: "Production", Model: Production, titleField: "title", field: "videos.thumbnail" },
  { resourceType: "Production", Model: Production, titleField: "title", field: "announcement.image" },
  { resourceType: "Artist", Model: Artist, titleField: "displayName", field: "image" },
  { resourceType: "Artist", Model: Artist, titleField: "displayName", field: "gallery" },
  { resourceType: "Artist", Model: Artist, titleField: "displayName", field: "galleryItems.media" },
  { resourceType: "News", Model: News, titleField: "title", field: "image" },
  { resourceType: "News", Model: News, titleField: "title", field: "gallery" },
  { resourceType: "News", Model: News, titleField: "title", field: "galleryItems.media" },
  { resourceType: "News", Model: News, titleField: "title", field: "attachment" },
  { resourceType: "PromoSlide", Model: PromoSlide, titleField: "title", field: "image" },
  { resourceType: "StaticPage", Model: StaticPage, titleField: "title", field: "image" },
  { resourceType: "StaticPage", Model: StaticPage, titleField: "title", field: "gallery" },
  { resourceType: "StaticPage", Model: StaticPage, titleField: "title", field: "galleryItems.media" },
  { resourceType: "StaticPage", Model: StaticPage, titleField: "title", field: "sections.image" },
  { resourceType: "StaticPage", Model: StaticPage, titleField: "title", field: "sections.backgroundImage" },
  { resourceType: "StaticPage", Model: StaticPage, titleField: "title", field: "sections.timelineItems.image" },
  { resourceType: "StaticPage", Model: StaticPage, titleField: "title", field: "sections.featureItems.image" },
  { resourceType: "StaticPage", Model: StaticPage, titleField: "title", field: "sections.galleryItems.media" },
  { resourceType: "StaticPage", Model: StaticPage, titleField: "title", field: "attachments" },
  { resourceType: "Venue", Model: Venue, titleField: "name", field: "images" },
  { resourceType: "HomepageConfig", Model: HomepageConfig, titleField: "key", field: "institutionalTeaser.image" },
  { resourceType: "HomepageConfig", Model: HomepageConfig, titleField: "key", field: "ctaCards.image" },
  { resourceType: "SiteSettings", Model: SiteSettings, titleField: "siteName", field: "mainLogo" },
  { resourceType: "SiteSettings", Model: SiteSettings, titleField: "siteName", field: "footerLogo" },
  { resourceType: "SiteSettings", Model: SiteSettings, titleField: "siteName", field: "socialImage" },
  { resourceType: "SiteSettings", Model: SiteSettings, titleField: "siteName", field: "partnerLogos.media" },
];

const findMediaUsage = async (mediaId) => {
  const results = await Promise.all(
    usageChecks.map(async (check) => {
      const resources = await check.Model.find({ [check.field]: mediaId })
        .select(`${check.titleField} slug`)
        .lean();

      return resources.map((resource) => ({
        resourceType: check.resourceType,
        resourceId: String(resource._id),
        resourceTitle: resource[check.titleField] || resource.slug || String(resource._id),
        field: check.field,
      }));
    })
  );

  return results.flat();
};

module.exports = {
  findMediaUsage,
};
