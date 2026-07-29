const Event = require("../models/Event");
const HomepageConfig = require("../models/HomepageConfig");
const News = require("../models/News");
const Production = require("../models/Production");
const PromoSlide = require("../models/PromoSlide");
const { publicPublishedFilter } = require("./cms.service");
const { eventDto, homepageConfigDto, newsDto, productionDto, promoSlideDto } = require("./cmsDto.service");
const { populateNews, populateProduction } = require("./cmsPopulate.service");
const { localeAvailabilityFilter, normalizeLocale } = require("./locale.service");

const homepageProductionPopulate = [
  { path: "poster" },
  { path: "gallery" },
  { path: "galleryItems.media" },
  { path: "venue" },
  { path: "videos.thumbnail" },
];

const populateHomepageConfig = (query) => query
  .populate({ path: "hero.selectedSlides", populate: [
    { path: "image" },
    { path: "relatedProduction", populate: homepageProductionPopulate },
    { path: "relatedEvent", populate: [{ path: "venue" }, { path: "production", populate: { path: "poster" } }] },
  ] })
  .populate({ path: "upcomingEvents.selectedEvents", populate: [{ path: "production", populate: { path: "poster" } }, { path: "venue" }] })
  .populate({ path: "repertoireProductions.selectedProductions", populate: homepageProductionPopulate })
  .populate({ path: "featuredProductions.selectedProductions", populate: homepageProductionPopulate })
  .populate({ path: "featuredNews.selectedNews", populate: [{ path: "image" }, { path: "relatedProduction", populate: { path: "poster" } }] })
  .populate("institutionalTeaser.image")
  .populate("institutionalTeaser.linkedPage")
  .populate("ctaCards.image");

const getOrCreateHomepageConfig = async () => {
  let config = await HomepageConfig.findOne({ key: "default" });
  if (!config) config = await HomepageConfig.create({ key: "default" });
  return config;
};

const isPublishedAt = (item, now) => (
  item?.status === "published"
  && (!item.publishedAt || new Date(item.publishedAt) <= now)
);

const getResolvedHomepage = async (locale = "sr") => {
  const requestedLocale = normalizeLocale(locale);
  const now = new Date();
  const config = await populateHomepageConfig(HomepageConfig.findOne({ key: "default" }));
  const effective = config || new HomepageConfig({ key: "default" });

  const slideFilter = {
    ...publicPublishedFilter(now),
    ...localeAvailabilityFilter(requestedLocale, ["title"]),
    $and: [
      { $or: [{ activeFrom: null }, { activeFrom: { $exists: false } }, { activeFrom: { $lte: now } }] },
      { $or: [{ activeUntil: null }, { activeUntil: { $exists: false } }, { activeUntil: { $gte: now } }] },
    ],
  };

  const slides = effective.hero.mode === "manual" && effective.hero.selectedSlides?.length
    ? effective.hero.selectedSlides.filter((item) => (
        isPublishedAt(item, now)
        && (!item.activeFrom || new Date(item.activeFrom) <= now)
        && (!item.activeUntil || new Date(item.activeUntil) >= now)
      )).slice(0, effective.hero.limit || 5)
    : await PromoSlide.find(slideFilter)
        .sort("-createdAt")
        .limit(effective.hero.limit || 5)
        .populate("image")
        .populate({ path: "relatedProduction", match: localeAvailabilityFilter(requestedLocale), populate: homepageProductionPopulate })
        .populate({ path: "relatedEvent", populate: [{ path: "venue" }, { path: "production", populate: { path: "poster" } }] });

  const eventFilter = { status: "scheduled", startsAt: { $gte: effective.upcomingEvents.dateFrom || now } };
  if (effective.upcomingEvents.dateTo) eventFilter.startsAt.$lte = effective.upcomingEvents.dateTo;
  const events = effective.upcomingEvents.mode === "manual" && effective.upcomingEvents.selectedEvents?.length
    ? effective.upcomingEvents.selectedEvents.filter((event) => (
        event.status === "scheduled"
        && new Date(event.startsAt) >= now
        && isPublishedAt(event.production, now)
      )).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)).slice(0, effective.upcomingEvents.limit || 8)
    : await Event.find(eventFilter)
        .sort("startsAt")
        .limit(effective.upcomingEvents.limit || 8)
        .populate({ path: "production", match: { ...publicPublishedFilter(now), ...localeAvailabilityFilter(requestedLocale) }, populate: { path: "poster" } })
        .populate("venue");

  const repertoireFilter = { ...publicPublishedFilter(now), ...localeAvailabilityFilter(requestedLocale), isOnRepertoire: { $ne: false } };
  if (effective.repertoireProductions.allowedTypes?.length) repertoireFilter.type = { $in: effective.repertoireProductions.allowedTypes };
  const repertoireProductions = effective.repertoireProductions.mode === "manual" && effective.repertoireProductions.selectedProductions?.length
    ? effective.repertoireProductions.selectedProductions.filter((item) => isPublishedAt(item, now)).slice(0, effective.repertoireProductions.limit || 8)
    : await populateProduction(Production.find(repertoireFilter).sort("title").limit(effective.repertoireProductions.limit || 8));

  const productionFilter = { ...publicPublishedFilter(now), ...localeAvailabilityFilter(requestedLocale), isFeatured: true };
  if (effective.featuredProductions.allowedTypes?.length) productionFilter.type = { $in: effective.featuredProductions.allowedTypes };
  const productions = effective.featuredProductions.mode === "manual" && effective.featuredProductions.selectedProductions?.length
    ? effective.featuredProductions.selectedProductions.filter((item) => isPublishedAt(item, now)).slice(0, effective.featuredProductions.limit || 6)
    : await populateProduction(Production.find(productionFilter).sort("-isFeatured title").limit(effective.featuredProductions.limit || 6));

  const newsFilter = { ...publicPublishedFilter(now), ...localeAvailabilityFilter(requestedLocale, ["title", "slug", "excerpt"]), isFeatured: true };
  if (effective.featuredNews.category) newsFilter.category = effective.featuredNews.category;
  const news = effective.featuredNews.mode === "manual" && effective.featuredNews.selectedNews?.length
    ? effective.featuredNews.selectedNews.filter((item) => isPublishedAt(item, now)).slice(0, effective.featuredNews.limit || 6)
    : await populateNews(News.find(newsFilter).sort("-publishedAt").limit(effective.featuredNews.limit || 6));

  return {
    locale: requestedLocale,
    config: homepageConfigDto(effective, requestedLocale),
    slides: effective.hero.enabled === false ? [] : slides.map((item) => promoSlideDto(item, requestedLocale)),
    upcomingEvents: effective.upcomingEvents.enabled === false ? [] : events.filter((event) => event.production).map((item) => eventDto(item, requestedLocale)),
    repertoireProductions: effective.repertoireProductions.enabled === false ? [] : repertoireProductions.map((item) => productionDto(item, requestedLocale)),
    featuredProductions: effective.featuredProductions.enabled === false ? [] : productions.map((item) => productionDto(item, requestedLocale)),
    featuredNews: effective.featuredNews.enabled === false ? [] : news.map((item) => newsDto(item, requestedLocale)),
  };
};

module.exports = {
  getOrCreateHomepageConfig,
  getResolvedHomepage,
  populateHomepageConfig,
};
