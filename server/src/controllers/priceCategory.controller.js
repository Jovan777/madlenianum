const asyncHandler = require("../utils/asyncHandler");
const PriceCategory = require("../models/PriceCategory");
const { conflictError, getPriceCategoryUsage, validationError } = require("../services/ticketingConfiguration.service");

const normalizePayload = (payload = {}) => ({
  ...(payload.code !== undefined ? { code: String(payload.code || "").trim().toUpperCase() } : {}),
  ...(payload.name !== undefined ? { name: String(payload.name || "").trim() } : {}),
  ...(payload.description !== undefined ? { description: String(payload.description || "").trim() } : {}),
  ...(payload.status !== undefined ? { status: payload.status } : {}),
});

const validatePayload = (payload, existing = null) => {
  const effective = { ...(existing?.toObject ? existing.toObject() : existing), ...payload };
  const errors = [];
  if (!effective.code) errors.push({ field: "code", code: "required", message: "Šifra kategorije je obavezna." });
  if (effective.code && !/^[A-Z0-9_-]+$/.test(effective.code)) {
    errors.push({ field: "code", code: "invalid_format", message: "Šifra može sadržati slova, brojeve, donju crtu i crticu." });
  }
  if (!effective.name) errors.push({ field: "name", code: "required", message: "Naziv kategorije je obavezan." });
  if (!['active', 'inactive'].includes(effective.status || "active")) {
    errors.push({ field: "status", code: "invalid_status", message: "Status kategorije nije podržan." });
  }
  if (errors.length) throw validationError("Cenovna kategorija nije ispravna.", errors);
};

const getPriceCategories = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const escaped = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { code: new RegExp(escaped, "i") },
      { name: new RegExp(escaped, "i") },
      { description: new RegExp(escaped, "i") },
    ];
  }
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const [categories, total] = await Promise.all([
    PriceCategory.find(filter).sort("code").skip((page - 1) * limit).limit(limit),
    PriceCategory.countDocuments(filter),
  ]);
  const items = await Promise.all(categories.map(async (category) => ({
    ...category.toObject(),
    usage: await getPriceCategoryUsage(category._id),
  })));
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const getPriceCategoryById = asyncHandler(async (req, res) => {
  const item = await PriceCategory.findById(req.params.id);
  if (!item) {
    const error = new Error("Cenovna kategorija nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, item, meta: { usage: await getPriceCategoryUsage(item._id) } });
});

const createPriceCategory = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
  validatePayload(payload);
  const item = await PriceCategory.create(payload);
  res.status(201).json({ success: true, item });
});

const updatePriceCategory = asyncHandler(async (req, res) => {
  const item = await PriceCategory.findById(req.params.id);
  if (!item) {
    const error = new Error("Cenovna kategorija nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  const payload = normalizePayload(req.body);
  validatePayload(payload, item);
  const usage = await getPriceCategoryUsage(item._id);
  if (usage.hasUsage && payload.code !== undefined && payload.code !== item.code) {
    throw conflictError("Šifra korišćene cenovne kategorije ne može biti promenjena.", {
      fields: ["code"],
      usage,
      recommendation: "Deaktivirajte kategoriju i napravite novu sa drugom šifrom.",
    });
  }
  Object.assign(item, payload);
  await item.save();
  res.json({ success: true, item, meta: { usage } });
});

const deletePriceCategory = asyncHandler(async (req, res) => {
  const item = await PriceCategory.findById(req.params.id);
  if (!item) {
    const error = new Error("Cenovna kategorija nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  const usage = await getPriceCategoryUsage(item._id);
  if (usage.hasUsage) {
    throw conflictError("Cenovna kategorija ne može biti obrisana jer je u upotrebi.", {
      usage,
      recommendation: "Postavite status na Neaktivna da biste sačuvali istorijsko značenje.",
    });
  }
  await item.deleteOne();
  res.json({ success: true, message: "Cenovna kategorija je obrisana." });
});

module.exports = {
  createPriceCategory,
  deletePriceCategory,
  getPriceCategories,
  getPriceCategoryById,
  updatePriceCategory,
};
