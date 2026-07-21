const asyncHandler = require("../utils/asyncHandler");

const Artist = require("../models/Artist");
const Production = require("../models/Production");
const Event = require("../models/Event");
const News = require("../models/News");
const StaticPage = require("../models/StaticPage");
const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const ContactMessage = require("../models/ContactMessage");
const SiteSettings = require("../models/SiteSettings");
const {
  artistDto,
  castDto,
  creativeTeamDto,
  eventDto,
  idOf,
  newsDto,
  pageDto,
  productionDto,
  productionSummaryDto,
  siteSettingsDto,
} = require("../services/cmsDto.service");
const { populateArtist, populateNews, populatePage, populateProduction } = require("../services/cmsPopulate.service");
const { createHttpError, escapeRegex, publicPublishedFilter } = require("../services/cms.service");
const { getResolvedHomepage } = require("../services/homepage.service");
const { populateSiteSettings } = require("../services/siteSettings.service");

const getHome = asyncHandler(async (req, res) => {
  const data = await getResolvedHomepage();
  res.json({ success: true, ...data, data });
});

const getRepertoire = asyncHandler(async (req, res) => {
  const now = new Date();
  const hasExplicitMonth = req.query.month !== undefined || req.query.year !== undefined;
  const month = hasExplicitMonth ? Number(req.query.month) || now.getMonth() + 1 : now.getMonth() + 1;
  const year = hasExplicitMonth ? Number(req.query.year) || now.getFullYear() : now.getFullYear();
  const from = hasExplicitMonth
    ? new Date(year, month - 1, 1, 0, 0, 0)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const to = hasExplicitMonth
    ? new Date(year, month, 1, 0, 0, 0)
    : new Date(from.getTime() + 120 * 24 * 60 * 60 * 1000);

  const events = await Event.find({ status: "scheduled", startsAt: { $gte: from, $lt: to } })
    .sort("startsAt")
    .populate({ path: "production", match: publicPublishedFilter(now), populate: { path: "poster" } })
    .populate("venue");
  const items = events.filter((event) => event.production).map(eventDto);
  res.json({ success: true, events: items, data: { month, year, events: items } });
});

const listProductions = asyncHandler(async (req, res) => {
  const filter = publicPublishedFilter();
  if (req.query.type) filter.type = req.query.type;
  if (req.query.isOnRepertoire !== undefined) filter.isOnRepertoire = req.query.isOnRepertoire === "true";
  if (req.query.q) {
    const search = new RegExp(escapeRegex(req.query.q), "i");
    filter.$and = [{ $or: [{ title: search }, { authorComposer: search }, { shortDescription: search }] }];
  }
  const items = await populateProduction(Production.find(filter).sort("-isFeatured title"));
  res.json({ success: true, items: items.map(productionSummaryDto) });
});

const getProductionBySlug = asyncHandler(async (req, res) => {
  const production = await populateProduction(Production.findOne({ slug: req.params.slug, ...publicPublishedFilter() }));
  if (!production) throw createHttpError(404, "Predstava nije pronadjena.");
  const events = await Event.find({ production: production._id, status: "scheduled", startsAt: { $gte: new Date() } })
    .sort("startsAt")
    .populate("venue");
  const item = productionDto(production);
  const upcomingEvents = events.map((event) => eventDto({ ...event.toObject(), production }));
  res.json({ success: true, item, production: item, events: upcomingEvents, upcomingEvents });
});

const listArtists = asyncHandler(async (req, res) => {
  const filter = publicPublishedFilter();
  if (req.query.q) {
    const search = new RegExp(escapeRegex(req.query.q), "i");
    filter.$and = [{ $or: [{ displayName: search }, { professions: search }] }];
  }
  const items = await populateArtist(Artist.find(filter).sort("displayName"));
  res.json({ success: true, items: items.map(artistDto) });
});

const getArtistBySlug = asyncHandler(async (req, res) => {
  const artist = await populateArtist(Artist.findOne({ slug: req.params.slug, ...publicPublishedFilter() }));
  if (!artist) throw createHttpError(404, "Umetnik nije pronadjen.");

  const productions = await populateProduction(Production.find({
    ...publicPublishedFilter(),
    $and: [{
      $or: [
        { "creativeTeam.artist": artist._id },
        { "cast.artist": artist._id },
        { "cast.artists": artist._id },
      ],
    }],
  }).sort("title"));

  const relatedProductions = productions.map((production) => {
    const credits = creativeTeamDto(production).filter((credit) => idOf(credit.artist) === String(artist._id));
    const cast = castDto(production).filter((member) => idOf(member.artist) === String(artist._id));
    return {
      ...productionSummaryDto(production),
      relationshipTypes: [credits.length ? "creativeTeam" : null, cast.length ? "cast" : null].filter(Boolean),
      credits: credits.map((credit) => ({ roleKey: credit.roleKey, label: credit.label })),
      roles: cast.map((member) => member.role).filter(Boolean),
    };
  });

  const item = { ...artistDto(artist), relatedProductions };
  res.json({ success: true, item, artist: item, productions: relatedProductions });
});

const listNews = asyncHandler(async (req, res) => {
  const filter = publicPublishedFilter();
  if (req.query.category) filter.category = req.query.category;
  const items = await populateNews(News.find(filter).sort("-publishedAt -createdAt"));
  res.json({ success: true, items: items.map(newsDto) });
});

const getNewsBySlug = asyncHandler(async (req, res) => {
  const item = await populateNews(News.findOne({ slug: req.params.slug, ...publicPublishedFilter() }));
  if (!item) throw createHttpError(404, "Vest nije pronadjena.");
  res.json({ success: true, item: newsDto(item) });
});

const getPageBySlug = asyncHandler(async (req, res) => {
  const item = await populatePage(StaticPage.findOne({ slug: req.params.slug, ...publicPublishedFilter() }));
  if (!item) throw createHttpError(404, "Strana nije pronadjena.");
  const response = pageDto(item);
  if (item.pageType === "contact") {
    const settings = await populateSiteSettings(SiteSettings.findOne({ key: "default" }));
    response.organizationContact = siteSettingsDto(settings).contact;
    response.socialLinks = siteSettingsDto(settings).socialLinks;
  }
  res.json({ success: true, item: response });
});

const getPublicSiteSettings = asyncHandler(async (req, res) => {
  const settings = await populateSiteSettings(SiteSettings.findOne({ key: "default" }));
  res.json({ success: true, item: siteSettingsDto(settings) });
});

const subscribeNewsletter = asyncHandler(async (req, res) => {
  const { email, fullName, language } = req.body;
  if (!email) throw createHttpError(400, "Email je obavezan.");
  await NewsletterSubscriber.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), fullName: fullName || "", language: language || "sr", status: "active", source: "website", consentAt: new Date() },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  res.status(201).json({ success: true, message: "Prijava je sacuvana." });
});

const sendContactMessage = asyncHandler(async (req, res) => {
  await ContactMessage.create({
    fullName: req.body.fullName,
    email: req.body.email,
    phone: req.body.phone || "",
    subject: req.body.subject || "",
    message: req.body.message,
    sourcePage: req.body.sourcePage || "",
  });
  res.status(201).json({ success: true, message: "Poruka je sacuvana." });
});

module.exports = {
  getArtistBySlug,
  getHome,
  getNewsBySlug,
  getPageBySlug,
  getProductionBySlug,
  getPublicSiteSettings,
  getRepertoire,
  listArtists,
  listNews,
  listProductions,
  sendContactMessage,
  subscribeNewsletter,
};
