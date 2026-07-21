const asyncHandler = require("../utils/asyncHandler");

const Production = require("../models/Production");
const Venue = require("../models/Venue");
const SeatMap = require("../models/SeatMap");
const PricePlan = require("../models/PricePlan");
const PriceCategory = require("../models/PriceCategory");
const Artist = require("../models/Artist");
const Media = require("../models/Media");
const Event = require("../models/Event");
const News = require("../models/News");
const PromoSlide = require("../models/PromoSlide");
const StaticPage = require("../models/StaticPage");
const { CREATIVE_ROLE_KEYS } = require("../models/Production");
const { NEWS_CATEGORIES } = require("../models/News");

const EVENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "postponed", label: "Postponed" },
  { value: "finished", label: "Finished" },
];

const SALE_STATUSES = [
  { value: "not_on_sale", label: "Not on sale" },
  { value: "on_sale", label: "On sale" },
  { value: "sold_out", label: "Sold out" },
  { value: "sales_closed", label: "Sales closed" },
  { value: "free", label: "Free" },
];

const TICKETING_PROVIDERS = [
  { value: "internal", label: "Internal ticketing" },
  { value: "legacy_php", label: "Legacy PHP checkout" },
  { value: "external", label: "External checkout" },
  { value: "manual", label: "Manual / no online sales" },
];

const PRODUCTION_TYPES = [
  { value: "opera", label: "Opera" },
  { value: "opereta", label: "Opereta" },
  { value: "balet", label: "Balet" },
  { value: "drama", label: "Drama" },
  { value: "mjuzikl", label: "Mjuzikl" },
  { value: "koncert", label: "Koncert" },
  { value: "gostujuca_predstava", label: "Gostujuća predstava" },
  { value: "ostalo", label: "Ostalo" },
];

const CONTENT_STATUSES = [
  { value: "draft", label: "Nacrt" },
  { value: "published", label: "Objavljeno" },
  { value: "archived", label: "Arhivirano" },
];

const CREATIVE_ROLES = [
  ["writer", "Pisac / autor"],
  ["director", "Reditelj"],
  ["composer", "Kompozitor"],
  ["conductor", "Dirigent"],
  ["choreographer", "Koreograf"],
  ["dramaturg", "Dramaturg"],
  ["scenographer", "Scenograf"],
  ["costumeDesigner", "Kostimograf"],
  ["lightingDesigner", "Dizajn svetla"],
  ["music", "Muzika"],
  ["other", "Drugo"],
]
  .filter(([value]) => CREATIVE_ROLE_KEYS.includes(value))
  .map(([value, label]) => ({ value, label }));

const getEventFormOptions = asyncHandler(async (req, res) => {
  const venueFilter = {};
  const seatMapFilter = {};
  const pricePlanFilter = {};

  if (req.query.venue) {
    seatMapFilter.venue = req.query.venue;
    pricePlanFilter.venue = req.query.venue;
  }

  if (req.query.productionType) {
    pricePlanFilter.productionTypes = req.query.productionType;
  }

  if (req.query.isPremiere !== undefined) {
    pricePlanFilter.isPremiere = req.query.isPremiere === "true";
  }

  const [
    productions,
    venues,
    seatMaps,
    pricePlans,
    priceCategories,
  ] = await Promise.all([
    Production.find({ status: { $ne: "archived" } })
      .select("title slug type status season isOnRepertoire isFeatured")
      .sort("title"),
    Venue.find(venueFilter)
      .select("name slug venueType capacity status")
      .sort("name"),
    SeatMap.find(seatMapFilter)
      .populate("venue")
      .select("name slug venue status canvas sections")
      .sort("name"),
    PricePlan.find(pricePlanFilter)
      .populate("venue")
      .populate("rules.priceCategory")
      .select("name venue productionTypes isPremiere currency rules status validFrom validTo")
      .sort("name"),
    PriceCategory.find({ status: "active" }).sort("code"),
  ]);

  res.json({
    success: true,
    options: {
      productions,
      venues,
      seatMaps,
      pricePlans,
      priceCategories,
      eventStatuses: EVENT_STATUSES,
      saleStatuses: SALE_STATUSES,
      ticketingProviders: TICKETING_PROVIDERS,
      productionTypes: PRODUCTION_TYPES,
    },
  });
});

const getProductionFormOptions = asyncHandler(async (req, res) => {
  const [artists, media, venues, productions] = await Promise.all([
    Artist.find({ status: { $ne: "archived" } })
      .select("displayName slug professions status image")
      .sort("displayName"),
    Media.find({ fileType: "image" })
      .select("title originalName filename url alt caption fileType createdAt")
      .sort("-createdAt")
      .limit(200),
    Venue.find({ status: { $ne: "archived" } })
      .select("name slug venueType capacity status")
      .sort("name"),
    Production.find({ status: { $ne: "archived" } })
      .select("title slug type status season poster")
      .populate("poster")
      .sort("title"),
  ]);

  res.json({
    success: true,
    options: {
      artists,
      media,
      venues,
      productions,
      productionTypes: PRODUCTION_TYPES,
      statuses: CONTENT_STATUSES,
      creativeRoles: CREATIVE_ROLES,
      videoProviders: [
        { value: "youtube", label: "YouTube" },
        { value: "vimeo", label: "Vimeo" },
        { value: "external", label: "Drugi spoljni link" },
      ],
    },
  });
});

const getArtistFormOptions = asyncHandler(async (req, res) => {
  const media = await Media.find({ fileType: "image" })
    .select("title originalName filename url alt caption fileType createdAt")
    .sort("-createdAt")
    .limit(200);

  res.json({
    success: true,
    options: {
      media,
      statuses: CONTENT_STATUSES,
      linkTypes: ["website", "instagram", "facebook", "youtube", "wikipedia", "other"].map((value) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1),
      })),
    },
  });
});

const getSeatMapFormOptions = asyncHandler(async (req, res) => {
  const venues = await Venue.find()
    .select("name slug venueType capacity status")
    .sort("name");

  res.json({
    success: true,
    options: {
      venues,
      statuses: [
        { value: "draft", label: "Draft" },
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
      ],
    },
  });
});

const getPricePlanFormOptions = asyncHandler(async (req, res) => {
  const [venues, priceCategories] = await Promise.all([
    Venue.find()
      .select("name slug venueType capacity status")
      .sort("name"),
    PriceCategory.find({ status: "active" }).sort("code"),
  ]);

  res.json({
    success: true,
    options: {
      venues,
      priceCategories,
      productionTypes: PRODUCTION_TYPES,
      statuses: [
        { value: "draft", label: "Draft" },
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
      ],
    },
  });
});

const getNewsFormOptions = asyncHandler(async (req, res) => {
  const productions = await Production.find({ status: { $ne: "archived" } })
    .select("title slug type status season poster")
    .populate("poster")
    .sort("title");

  res.json({
    success: true,
    options: {
      productions,
      statuses: CONTENT_STATUSES,
      categories: NEWS_CATEGORIES.map((value) => ({ value, label: value.replace(/_/g, " ") })),
    },
  });
});

const getHomepageFormOptions = asyncHandler(async (req, res) => {
  const [slides, events, productions, news, pages] = await Promise.all([
    PromoSlide.find({ status: { $ne: "archived" } })
      .select("title status image relatedProduction")
      .populate("image")
      .sort("title"),
    Event.find({ status: { $in: ["scheduled", "draft"] } })
      .select("production venue startsAt status")
      .populate("production", "title type status")
      .populate("venue", "name")
      .sort("startsAt")
      .limit(200),
    Production.find({ status: { $ne: "archived" } })
      .select("title slug type status season poster")
      .populate("poster")
      .sort("title"),
    News.find({ status: { $ne: "archived" } })
      .select("title slug category status publishedAt image")
      .populate("image")
      .sort("-publishedAt")
      .limit(200),
    StaticPage.find({ status: { $ne: "archived" } })
      .select("title slug pageType status")
      .sort("title"),
  ]);

  res.json({
    success: true,
    options: { slides, events, productions, news, pages, productionTypes: PRODUCTION_TYPES },
  });
});

const getPromoSlideFormOptions = asyncHandler(async (req, res) => {
  const [productions, events] = await Promise.all([
    Production.find({ status: { $ne: "archived" } })
      .select("title slug type status season poster")
      .populate("poster")
      .sort("title"),
    Event.find({ status: { $in: ["scheduled", "draft"] } })
      .select("production venue startsAt status")
      .populate("production", "title type status")
      .populate("venue", "name")
      .sort("startsAt")
      .limit(200),
  ]);

  res.json({
    success: true,
    options: {
      productions,
      events,
      statuses: CONTENT_STATUSES,
      languages: [
        { value: "sr", label: "Srpski" },
        { value: "en", label: "Engleski" },
        { value: "und", label: "Nije odredjeno" },
      ],
    },
  });
});

module.exports = {
  getEventFormOptions,
  getProductionFormOptions,
  getArtistFormOptions,
  getSeatMapFormOptions,
  getPricePlanFormOptions,
  getNewsFormOptions,
  getHomepageFormOptions,
  getPromoSlideFormOptions,
};
