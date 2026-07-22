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

const cleanText = (value) => (value === undefined || value === null ? "" : String(value).trim());

const cleanRef = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    return value;
  }
  const text = String(value).trim();
  return text || undefined;
};

const hasLegacyPeople = (item) =>
  (Array.isArray(item.artists) && item.artists.length > 0) ||
  (Array.isArray(item.names) && item.names.some((name) => cleanText(name)));

const normalizePeoplePayload = (body = {}) => {
  const payload = { ...body };

  if (Array.isArray(payload.creativeTeam)) {
    payload.creativeTeam = payload.creativeTeam
      .map((raw, index) => {
        const source = raw && typeof raw === "object" ? raw : {};
        const artist = cleanRef(source.artist);
        const item = {
          ...source,
          roleKey: cleanText(source.roleKey) || "other",
          label: cleanText(source.label || source.role),
          name: cleanText(source.name),
          note: cleanText(source.note),
          displayOrder: Number.isFinite(Number(source.displayOrder)) ? Number(source.displayOrder) : index,
        };
        if (artist) item.artist = artist;
        else delete item.artist;
        return item;
      })
      .filter((item) => item.label && (item.artist || item.name));
  }

  if (Array.isArray(payload.cast)) {
    payload.cast = payload.cast
      .map((raw, index) => {
        const source = raw && typeof raw === "object" ? raw : {};
        const artist = cleanRef(source.artist);
        const item = {
          ...source,
          name: cleanText(source.name),
          role: cleanText(source.role || source.character),
          note: cleanText(source.note),
          displayOrder: Number.isFinite(Number(source.displayOrder)) ? Number(source.displayOrder) : index,
        };
        if (artist) item.artist = artist;
        else delete item.artist;
        return item;
      })
      .filter((item) => item.artist || item.name || hasLegacyPeople(item));
  }

  return payload;
};

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
  const production = new Production(normalizePeoplePayload(req.body));
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
  Object.assign(production, normalizePeoplePayload(req.body));
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
