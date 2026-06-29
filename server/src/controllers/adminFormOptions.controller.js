const asyncHandler = require("../utils/asyncHandler");

const Production = require("../models/Production");
const Venue = require("../models/Venue");
const SeatMap = require("../models/SeatMap");
const PricePlan = require("../models/PricePlan");
const PriceCategory = require("../models/PriceCategory");
const Artist = require("../models/Artist");
const Media = require("../models/Media");

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
  const [artists, media, venues] = await Promise.all([
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
  ]);

  res.json({
    success: true,
    options: {
      artists,
      media,
      venues,
      productionTypes: PRODUCTION_TYPES,
      statuses: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
        { value: "archived", label: "Archived" },
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
      statuses: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
        { value: "archived", label: "Archived" },
      ],
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

module.exports = {
  getEventFormOptions,
  getProductionFormOptions,
  getArtistFormOptions,
  getSeatMapFormOptions,
  getPricePlanFormOptions,
};
