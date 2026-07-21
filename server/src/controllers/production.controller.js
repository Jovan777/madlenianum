const asyncHandler = require("../utils/asyncHandler");
const Event = require("../models/Event");
const Production = require("../models/Production");
const { productionDto } = require("../services/cmsDto.service");
const { populateProduction } = require("../services/cmsPopulate.service");
const {
  applyAudit,
  applyPublishing,
  createHttpError,
  escapeRegex,
  paginationFrom,
  sendList,
} = require("../services/cms.service");

const getProductions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query);
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.season) filter.season = req.query.season;
  if (req.query.isFeatured !== undefined) filter.isFeatured = req.query.isFeatured === "true";
  if (req.query.isOnRepertoire !== undefined) filter.isOnRepertoire = req.query.isOnRepertoire === "true";
  if (req.query.isAnnounced !== undefined) filter["announcement.isAnnounced"] = req.query.isAnnounced === "true";
  if (req.query.q) {
    const search = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ title: search }, { subtitle: search }, { authorComposer: search }];
  }

  const sortMap = {
    title: "title",
    newest: "-createdAt",
    updated: "-updatedAt",
    featured: "-isFeatured title",
  };
  const sort = sortMap[req.query.sort] || "-updatedAt";

  const [total, productions] = await Promise.all([
    Production.countDocuments(filter),
    populateProduction(Production.find(filter).sort(sort).skip(skip).limit(limit)),
  ]);

  sendList(res, { items: productions, total, page, limit });
});

const getProductionById = asyncHandler(async (req, res) => {
  const production = await populateProduction(Production.findById(req.params.id));
  if (!production) throw createHttpError(404, "Predstava nije pronadjena.");
  res.json({ success: true, item: production });
});

const previewProduction = asyncHandler(async (req, res) => {
  const production = await populateProduction(Production.findById(req.params.id));
  if (!production) throw createHttpError(404, "Predstava nije pronadjena.");
  res.json({ success: true, preview: true, robots: "noindex,nofollow", item: productionDto(production) });
});

const createProduction = asyncHandler(async (req, res) => {
  const production = new Production(req.body);
  applyAudit(production, req.admin, { isNew: true });
  applyPublishing(production);
  await production.save();
  const item = await populateProduction(Production.findById(production._id));
  res.status(201).json({ success: true, item });
});

const updateProduction = asyncHandler(async (req, res) => {
  const production = await Production.findById(req.params.id);
  if (!production) throw createHttpError(404, "Predstava nije pronadjena.");

  const previousStatus = production.status;
  Object.assign(production, req.body);
  applyAudit(production, req.admin);
  applyPublishing(production, previousStatus);
  await production.save();

  const item = await populateProduction(Production.findById(production._id));
  res.json({ success: true, item });
});

const archiveProduction = asyncHandler(async (req, res) => {
  const production = await Production.findById(req.params.id);
  if (!production) throw createHttpError(404, "Predstava nije pronadjena.");
  production.status = "archived";
  applyAudit(production, req.admin);
  await production.save();
  res.json({ success: true, message: "Predstava je arhivirana.", item: production });
});

const deleteProduction = asyncHandler(async (req, res) => {
  const production = await Production.findById(req.params.id);
  if (!production) throw createHttpError(404, "Predstava nije pronadjena.");

  const [events, recommendations] = await Promise.all([
    Event.find({ production: production._id }).select("startsAt status").limit(20).lean(),
    Production.find({ recommendedProductions: production._id }).select("title slug status").limit(20).lean(),
  ]);

  if (events.length || recommendations.length) {
    throw createHttpError(409, "Predstava je u upotrebi i ne moze biti obrisana. Arhivirajte je umesto brisanja.", {
      events: events.map((event) => ({ id: String(event._id), startsAt: event.startsAt, status: event.status })),
      recommendedBy: recommendations.map((item) => ({ id: String(item._id), title: item.title, slug: item.slug })),
    });
  }

  await production.deleteOne();
  res.json({ success: true, message: "Predstava je obrisana." });
});

module.exports = {
  archiveProduction,
  createProduction,
  deleteProduction,
  getProductionById,
  getProductions,
  previewProduction,
  updateProduction,
};
