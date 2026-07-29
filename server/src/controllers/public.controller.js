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
const { combineFilters, createHttpError, escapeRegex, publicPublishedFilter } = require("../services/cms.service");
const { getResolvedHomepage } = require("../services/homepage.service");
const { populateSiteSettings } = require("../services/siteSettings.service");
const {
  localeAvailabilityFilter,
  localeMessage,
  localizedSearchFields,
  localizedSlugQuery,
} = require("../services/locale.service");

const getHome = asyncHandler(async (req, res) => {
  const data = await getResolvedHomepage(req.locale);
  res.json({ success: true, ...data, data });
});

const activeAnnouncementFilter = (now, locale = "sr") => ({
  ...publicPublishedFilter(now),
  ...localeAvailabilityFilter(locale),
  "announcement.isAnnounced": true,
  $and: [
    { $or: [{ "announcement.startsAt": null }, { "announcement.startsAt": { $exists: false } }, { "announcement.startsAt": { $lte: now } }] },
    { $or: [{ "announcement.endsAt": null }, { "announcement.endsAt": { $exists: false } }, { "announcement.endsAt": { $gte: now } }] },
  ],
});

const getRepertoire = asyncHandler(async (req, res) => {
  const now = new Date();
  const view = ["current", "announced", "archive"].includes(req.query.view)
    ? req.query.view
    : "current";
  const hasExplicitMonth = req.query.month !== undefined || req.query.year !== undefined;
  const month = hasExplicitMonth ? Number(req.query.month) || now.getMonth() + 1 : now.getMonth() + 1;
  const year = hasExplicitMonth ? Number(req.query.year) || now.getFullYear() : now.getFullYear();
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
  const monthEnd = new Date(year, month, 1, 0, 0, 0);

  if (view === "announced") {
    const announcementFilter = activeAnnouncementFilter(now, req.locale);
    const monthFilter = hasExplicitMonth
      ? { "announcement.month": month, "announcement.year": year }
      : {};
    const [announcements, allAnnouncements] = await Promise.all([
      populateProduction(Production.find({ ...announcementFilter, ...monthFilter })
        .sort("announcement.year announcement.month title")),
      Production.find(announcementFilter)
        .select("announcement.month announcement.year")
        .sort("announcement.year announcement.month"),
    ]);
    const monthCounts = new Map();
    allAnnouncements.forEach((production) => {
      const announcementMonth = production.announcement?.month;
      const announcementYear = production.announcement?.year;
      if (!announcementMonth || !announcementYear) return;
      const key = `${announcementYear}-${announcementMonth}`;
      const item = monthCounts.get(key) || { year: announcementYear, month: announcementMonth, count: 0 };
      item.count += 1;
      monthCounts.set(key, item);
    });
    const availableMonths = Array.from(monthCounts.values()).slice(0, 18);
    const announcementItems = announcements.map((item) => productionDto(item, req.locale));
    const data = { view, month, year, events: [], announcements: announcementItems, availableMonths };
    res.json({ success: true, view, events: [], announcements: announcementItems, availableMonths, data });
    return;
  }

  const isArchive = view === "archive";
  const defaultFrom = isArchive
    ? new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const from = hasExplicitMonth ? monthStart : defaultFrom;
  const to = hasExplicitMonth
    ? monthEnd
    : (isArchive ? now : new Date(from.getTime() + 120 * 24 * 60 * 60 * 1000));
  const eventStatus = isArchive ? { $in: ["scheduled", "completed", "finished"] } : "scheduled";
  const dateRange = isArchive
    ? { $gte: from, $lt: new Date(Math.min(to.getTime(), now.getTime())) }
    : { $gte: new Date(Math.max(from.getTime(), now.getTime())), $lt: to };
  const availableDateFilter = isArchive ? { $lt: now } : { $gte: now };

  const [events, availableEventDates] = await Promise.all([
    Event.find({ status: eventStatus, startsAt: dateRange })
    .sort("startsAt")
    .populate({
      path: "production",
      match: { ...publicPublishedFilter(now), ...localeAvailabilityFilter(req.locale) },
      populate: [{ path: "poster" }, { path: "creativeTeam.artist", populate: { path: "image" } }],
    })
    .populate("venue"),
    Event.find({ status: eventStatus, startsAt: availableDateFilter })
      .sort("startsAt")
      .select("startsAt production")
      .populate({ path: "production", match: { ...publicPublishedFilter(now), ...localeAvailabilityFilter(req.locale) }, select: "_id" }),
  ]);
  const items = events.filter((event) => event.production).map((event) => eventDto(event, req.locale));
  const monthCounts = new Map();

  availableEventDates
    .filter((event) => event.production)
    .forEach((event) => {
      const eventDate = new Date(event.startsAt);
      const key = `${eventDate.getFullYear()}-${eventDate.getMonth() + 1}`;
      const current = monthCounts.get(key) || {
        year: eventDate.getFullYear(),
        month: eventDate.getMonth() + 1,
        count: 0,
      };
      current.count += 1;
      monthCounts.set(key, current);
    });

  const availableMonths = Array.from(monthCounts.values())
    .sort((a, b) => isArchive
      ? (b.year - a.year || b.month - a.month)
      : (a.year - b.year || a.month - b.month))
    .slice(0, 18);
  const data = { view, month, year, events: items, announcements: [], availableMonths };
  res.json({ success: true, view, events: items, announcements: [], availableMonths, data });
});

const listProductions = asyncHandler(async (req, res) => {
  const filter = { ...publicPublishedFilter(), ...localeAvailabilityFilter(req.locale) };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.isOnRepertoire !== undefined) filter.isOnRepertoire = req.query.isOnRepertoire === "true";
  if (req.query.q) {
    const search = new RegExp(escapeRegex(req.query.q), "i");
    filter.$and = [{ $or: localizedSearchFields(["title", "authorComposer", "shortDescription"], req.locale).map((field) => ({ [field]: search })) }];
  }
  const items = await populateProduction(Production.find(filter).sort("-isFeatured title"));
  res.json({ success: true, locale: req.locale, items: items.map((item) => productionSummaryDto(item, req.locale)) });
});

const getProductionBySlug = asyncHandler(async (req, res) => {
  const production = await populateProduction(Production.findOne(combineFilters(
    localizedSlugQuery(req.params.slug, req.locale),
    publicPublishedFilter(),
    localeAvailabilityFilter(req.locale)
  )));
  if (!production) throw createHttpError(404, localeMessage("productionNotFound", req.locale));
  const events = await Event.find({ production: production._id, status: "scheduled", startsAt: { $gte: new Date() } })
    .sort("startsAt")
    .populate("venue");
  const item = productionDto(production, req.locale);
  const upcomingEvents = events.map((event) => eventDto({ ...event.toObject(), production }, req.locale));
  res.json({ success: true, item, production: item, events: upcomingEvents, upcomingEvents });
});

const listArtists = asyncHandler(async (req, res) => {
  const filter = { ...publicPublishedFilter(), ...localeAvailabilityFilter(req.locale, ["displayName", "slug"]) };
  if (req.query.q) {
    const search = new RegExp(escapeRegex(req.query.q), "i");
    filter.$and = [{ $or: localizedSearchFields(["displayName", "professions"], req.locale).map((field) => ({ [field]: search })) }];
  }
  const items = await populateArtist(Artist.find(filter).sort("displayName"));
  res.json({ success: true, locale: req.locale, items: items.map((item) => artistDto(item, req.locale)) });
});

const getArtistBySlug = asyncHandler(async (req, res) => {
  const artist = await populateArtist(Artist.findOne(combineFilters(
    localizedSlugQuery(req.params.slug, req.locale),
    publicPublishedFilter(),
    localeAvailabilityFilter(req.locale, ["displayName", "slug"])
  )));
  if (!artist) throw createHttpError(404, localeMessage("artistNotFound", req.locale));

  const productions = await populateProduction(Production.find({
    ...publicPublishedFilter(),
    ...localeAvailabilityFilter(req.locale),
    $and: [{
      $or: [
        { "creativeTeam.artist": artist._id },
        { "cast.artist": artist._id },
        { "cast.artists": artist._id },
      ],
    }],
  }).sort("title"));

  const relatedProductions = productions.map((production) => {
    const credits = creativeTeamDto(production, req.locale).filter((credit) => idOf(credit.artist) === String(artist._id));
    const cast = castDto(production, req.locale).filter((member) => idOf(member.artist) === String(artist._id));
    return {
      ...productionSummaryDto(production, req.locale),
      relationshipTypes: [credits.length ? "creativeTeam" : null, cast.length ? "cast" : null].filter(Boolean),
      credits: credits.map((credit) => ({ roleKey: credit.roleKey, label: credit.label })),
      roles: cast.map((member) => member.role).filter(Boolean),
    };
  });

  const item = { ...artistDto(artist, req.locale), relatedProductions };
  res.json({ success: true, item, artist: item, productions: relatedProductions });
});

const listNews = asyncHandler(async (req, res) => {
  const filter = { ...publicPublishedFilter(), ...localeAvailabilityFilter(req.locale, ["title", "slug", "excerpt"]) };
  if (req.query.category) filter.category = req.query.category;
  const items = await populateNews(News.find(filter).sort("-publishedAt -createdAt"));
  res.json({ success: true, locale: req.locale, items: items.map((item) => newsDto(item, req.locale)) });
});

const getNewsBySlug = asyncHandler(async (req, res) => {
  const item = await populateNews(News.findOne(combineFilters(
    localizedSlugQuery(req.params.slug, req.locale),
    publicPublishedFilter(),
    localeAvailabilityFilter(req.locale, ["title", "slug", "excerpt"])
  )));
  if (!item) throw createHttpError(404, localeMessage("newsNotFound", req.locale));
  res.json({ success: true, locale: req.locale, item: newsDto(item, req.locale) });
});

const getPageBySlug = asyncHandler(async (req, res) => {
  const slugFilter = req.locale === "en"
    ? { $or: [{ slug: req.params.slug }, { "translations.en.slug": req.params.slug }] }
    : localizedSlugQuery(req.params.slug, req.locale);
  const item = await populatePage(StaticPage.findOne(combineFilters(
    slugFilter,
    publicPublishedFilter(),
    localeAvailabilityFilter(req.locale)
  )));
  if (!item) throw createHttpError(404, localeMessage("pageNotFound", req.locale));
  const response = pageDto(item, req.locale);
  if (item.pageType === "contact") {
    const settings = await populateSiteSettings(SiteSettings.findOne({ key: "default" }));
    response.organizationContact = siteSettingsDto(settings, req.locale).contact;
    response.socialLinks = siteSettingsDto(settings, req.locale).socialLinks;
  }
  res.json({ success: true, item: response });
});

const getPublicSiteSettings = asyncHandler(async (req, res) => {
  const settings = await populateSiteSettings(SiteSettings.findOne({ key: "default" }));
  res.json({ success: true, locale: req.locale, item: siteSettingsDto(settings, req.locale) });
});

const subscribeNewsletter = asyncHandler(async (req, res) => {
  const { email, fullName } = req.body;
  if (!email) throw createHttpError(400, localeMessage("requiredEmail", req.locale));
  await NewsletterSubscriber.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), fullName: fullName || "", language: req.locale, status: "active", source: "website", consentAt: new Date() },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  res.status(201).json({ success: true, message: localeMessage("newsletterSaved", req.locale) });
});

const sendContactMessage = asyncHandler(async (req, res) => {
  await ContactMessage.create({
    locale: req.locale,
    fullName: req.body.fullName,
    email: req.body.email,
    phone: req.body.phone || "",
    subject: req.body.subject || "",
    message: req.body.message,
    sourcePage: req.body.sourcePage || "",
  });
  res.status(201).json({ success: true, message: localeMessage("contactSaved", req.locale) });
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
