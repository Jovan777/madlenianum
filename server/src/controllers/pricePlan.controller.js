const asyncHandler = require("../utils/asyncHandler");
const PricePlan = require("../models/PricePlan");

const populatePricePlan = [
  { path: "venue" },
  { path: "rules.priceCategory" },
];

const getPricePlans = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.venue) filter.venue = req.query.venue;

  if (req.query.isPremiere !== undefined) {
    filter.isPremiere = req.query.isPremiere === "true";
  }

  if (req.query.productionType) {
    filter.productionTypes = req.query.productionType;
  }

  if (req.query.q) {
    filter.$or = [
      { name: new RegExp(req.query.q, "i") },
      { notes: new RegExp(req.query.q, "i") },
    ];
  }

  const items = await PricePlan.find(filter)
    .populate(populatePricePlan)
    .sort("-createdAt");

  res.json({
    success: true,
    items,
  });
});

const getPricePlanById = asyncHandler(async (req, res) => {
  const item = await PricePlan.findById(req.params.id).populate(populatePricePlan);

  if (!item) {
    res.status(404);
    throw new Error("Price plan not found.");
  }

  res.json({
    success: true,
    item,
  });
});

const createPricePlan = asyncHandler(async (req, res) => {
  const item = await PricePlan.create(req.body);

  const populatedItem = await PricePlan.findById(item._id).populate(populatePricePlan);

  res.status(201).json({
    success: true,
    item: populatedItem,
  });
});

const updatePricePlan = asyncHandler(async (req, res) => {
  const item = await PricePlan.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Price plan not found.");
  }

  Object.assign(item, req.body);
  await item.save();

  const updatedItem = await PricePlan.findById(item._id).populate(populatePricePlan);

  res.json({
    success: true,
    item: updatedItem,
  });
});

const deletePricePlan = asyncHandler(async (req, res) => {
  const item = await PricePlan.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Price plan not found.");
  }

  await item.deleteOne();

  res.json({
    success: true,
    message: "Price plan deleted.",
  });
});

module.exports = {
  getPricePlans,
  getPricePlanById,
  createPricePlan,
  updatePricePlan,
  deletePricePlan,
};