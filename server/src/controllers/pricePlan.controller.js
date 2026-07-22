const asyncHandler = require("../utils/asyncHandler");
const PricePlan = require("../models/PricePlan");
const {
  conflictError,
  getPricePlanUsage,
  normalizePricePlanPayload,
  pricePlanCriticalChanges,
  validatePricePlanPayload,
  validationError,
} = require("../services/ticketingConfiguration.service");

const populatePricePlan = [
  { path: "venue" },
  { path: "rules.priceCategory" },
  { path: "parentPlan", select: "name revision status" },
];

const buildFilter = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.venue) filter.venue = query.venue;
  if (query.isPremiere !== undefined && query.isPremiere !== "") {
    filter.isPremiere = query.isPremiere === "true";
  }
  if (query.productionType) filter.productionTypes = query.productionType;
  if (query.q) {
    const escaped = String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: new RegExp(escaped, "i") }, { notes: new RegExp(escaped, "i") }];
  }
  if (query.validOn) {
    const date = new Date(query.validOn);
    if (!Number.isNaN(date.getTime())) {
      filter.$and = [
        { $or: [{ validFrom: null }, { validFrom: { $exists: false } }, { validFrom: { $lte: date } }] },
        { $or: [{ validTo: null }, { validTo: { $exists: false } }, { validTo: { $gte: date } }] },
      ];
    }
  }
  return filter;
};

const getPricePlans = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const [plans, total] = await Promise.all([
    PricePlan.find(filter).populate(populatePricePlan).sort("-createdAt").skip((page - 1) * limit).limit(limit),
    PricePlan.countDocuments(filter),
  ]);
  const items = await Promise.all(plans.map(async (plan) => {
    const [usage, validation] = await Promise.all([
      getPricePlanUsage(plan._id),
      validatePricePlanPayload({}, { existingPlan: plan }),
    ]);
    return { ...plan.toObject(), usage, configurationWarnings: validation.warnings };
  }));
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const getPricePlanById = asyncHandler(async (req, res) => {
  const plan = await PricePlan.findById(req.params.id).populate(populatePricePlan);
  if (!plan) {
    const error = new Error("Cenovnik nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  const [usage, validation] = await Promise.all([
    getPricePlanUsage(plan._id),
    validatePricePlanPayload({}, { existingPlan: plan }),
  ]);
  res.json({
    success: true,
    item: { ...plan.toObject(), configurationWarnings: validation.warnings },
    meta: { usage },
  });
});

const validateRequest = async (payload, existingPlan = null) => {
  const result = await validatePricePlanPayload(payload, { existingPlan });
  if (result.errors.length) {
    throw validationError("Cenovnik nije ispravan.", result.errors, result.warnings);
  }
  return result;
};

const createPricePlan = asyncHandler(async (req, res) => {
  const validation = await validateRequest(req.body);
  const plan = await PricePlan.create({
    ...normalizePricePlanPayload(req.body),
    revision: Number(req.body.revision) || 1,
  });
  const populated = await PricePlan.findById(plan._id).populate(populatePricePlan);
  res.status(201).json({ success: true, item: populated, warnings: validation.warnings });
});

const updatePricePlan = asyncHandler(async (req, res) => {
  const plan = await PricePlan.findById(req.params.id);
  if (!plan) {
    const error = new Error("Cenovnik nije pronađen.");
    error.statusCode = 404;
    throw error;
  }

  const usage = await getPricePlanUsage(plan._id);
  const criticalFields = pricePlanCriticalChanges(plan, req.body);
  if (usage.hasUsage && criticalFields.length) {
    throw conflictError("Cenovnik je u upotrebi i kritične vrednosti ne mogu biti promenjene.", {
      fields: criticalFields,
      usage,
      recommendation: "Napravite novu verziju cenovnika i ručno je dodelite novim terminima.",
    });
  }
  if (usage.futureEvents > 0 && req.body.status && req.body.status !== "active") {
    throw conflictError("Aktivan cenovnik sa budućim terminima ne može biti deaktiviran ili arhiviran.", {
      fields: ["status"],
      usage,
    });
  }

  const validation = await validateRequest(req.body, plan);
  Object.assign(plan, normalizePricePlanPayload(req.body));
  await plan.save();
  const populated = await PricePlan.findById(plan._id).populate(populatePricePlan);
  res.json({ success: true, item: populated, warnings: validation.warnings });
});

const validatePricePlan = asyncHandler(async (req, res) => {
  const existingPlan = req.params.id ? await PricePlan.findById(req.params.id) : null;
  if (req.params.id && !existingPlan) {
    const error = new Error("Cenovnik nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  const result = await validatePricePlanPayload(req.body, { existingPlan });
  res.json({ success: true, valid: result.errors.length === 0, errors: result.errors, warnings: result.warnings });
});

const duplicatePricePlan = asyncHandler(async (req, res) => {
  const source = await PricePlan.findById(req.params.id);
  if (!source) {
    const error = new Error("Cenovnik nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  const revision = Number(source.revision || 1) + 1;
  const duplicate = await PricePlan.create({
    name: req.body?.name || `${source.name} - verzija ${revision}`,
    venue: source.venue,
    productionTypes: source.productionTypes,
    isPremiere: source.isPremiere,
    currency: source.currency,
    rules: source.rules.map((rule) => ({
      priceCategory: rule.priceCategory,
      amount: rule.amount,
      label: rule.label,
    })),
    validFrom: null,
    validTo: null,
    notes: source.notes,
    status: "draft",
    revision,
    parentPlan: source._id,
  });
  const populated = await PricePlan.findById(duplicate._id).populate(populatePricePlan);
  res.status(201).json({ success: true, item: populated, meta: { sourcePlanId: String(source._id) } });
});

const setPricePlanStatus = (status) => asyncHandler(async (req, res) => {
  const plan = await PricePlan.findById(req.params.id);
  if (!plan) {
    const error = new Error("Cenovnik nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  const usage = await getPricePlanUsage(plan._id);
  if (status !== "active" && usage.futureEvents > 0) {
    throw conflictError("Cenovnik ima buduće termine i ne može biti deaktiviran ili arhiviran.", { usage, fields: ["status"] });
  }
  if (status === "active") await validateRequest({ status }, plan);
  plan.status = status;
  await plan.save();
  const populated = await PricePlan.findById(plan._id).populate(populatePricePlan);
  res.json({ success: true, item: populated });
});

const deletePricePlan = asyncHandler(async (req, res) => {
  const plan = await PricePlan.findById(req.params.id);
  if (!plan) {
    const error = new Error("Cenovnik nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  const usage = await getPricePlanUsage(plan._id);
  if (usage.hasUsage) {
    throw conflictError("Cenovnik ne može biti obrisan jer je u upotrebi.", {
      usage,
      recommendation: "Arhivirajte cenovnik ili napravite novu verziju.",
    });
  }
  await plan.deleteOne();
  res.json({ success: true, message: "Cenovnik je obrisan." });
});

module.exports = {
  activatePricePlan: setPricePlanStatus("active"),
  archivePricePlan: setPricePlanStatus("archived"),
  createPricePlan,
  deactivatePricePlan: setPricePlanStatus("inactive"),
  deletePricePlan,
  duplicatePricePlan,
  getPricePlanById,
  getPricePlans,
  updatePricePlan,
  validatePricePlan,
};
