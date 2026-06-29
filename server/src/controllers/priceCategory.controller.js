const asyncHandler = require("../utils/asyncHandler");
const PriceCategory = require("../models/PriceCategory");

const getPriceCategories = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.q) {
    filter.$or = [
      { code: new RegExp(req.query.q, "i") },
      { name: new RegExp(req.query.q, "i") },
      { description: new RegExp(req.query.q, "i") },
    ];
  }

  const items = await PriceCategory.find(filter).sort("code");

  res.json({
    success: true,
    items,
  });
});

const getPriceCategoryById = asyncHandler(async (req, res) => {
  const item = await PriceCategory.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Price category not found.");
  }

  res.json({
    success: true,
    item,
  });
});

const createPriceCategory = asyncHandler(async (req, res) => {
  const item = await PriceCategory.create(req.body);

  res.status(201).json({
    success: true,
    item,
  });
});

const updatePriceCategory = asyncHandler(async (req, res) => {
  const item = await PriceCategory.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Price category not found.");
  }

  Object.assign(item, req.body);
  await item.save();

  res.json({
    success: true,
    item,
  });
});

const deletePriceCategory = asyncHandler(async (req, res) => {
  const item = await PriceCategory.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Price category not found.");
  }

  await item.deleteOne();

  res.json({
    success: true,
    message: "Price category deleted.",
  });
});

module.exports = {
  getPriceCategories,
  getPriceCategoryById,
  createPriceCategory,
  updatePriceCategory,
  deletePriceCategory,
};
