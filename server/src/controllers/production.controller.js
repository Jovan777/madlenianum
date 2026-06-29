const asyncHandler = require("../utils/asyncHandler");
const Production = require("../models/Production");

const getProductions = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  if (req.query.isOnRepertoire !== undefined) {
    filter.isOnRepertoire = req.query.isOnRepertoire === "true";
  }

  if (req.query.q) {
    filter.$or = [
      { title: new RegExp(req.query.q, "i") },
      { subtitle: new RegExp(req.query.q, "i") },
      { authorComposer: new RegExp(req.query.q, "i") },
      { description: new RegExp(req.query.q, "i") },
    ];
  }

  const total = await Production.countDocuments(filter);

  const productions = await Production.find(filter)
    .populate("poster")
    .populate("gallery")
    .populate("venue")
    .populate("creativeTeam.artist")
    .populate("cast.artists")
    .sort("-isFeatured title")
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: productions,
  });
});

const getProductionById = asyncHandler(async (req, res) => {
  const production = await Production.findById(req.params.id)
    .populate("poster")
    .populate("gallery")
    .populate("venue")
    .populate("creativeTeam.artist")
    .populate("cast.artists");

  if (!production) {
    res.status(404);
    throw new Error("Predstava nije pronađena.");
  }

  res.json({
    success: true,
    item: production,
  });
});

const createProduction = asyncHandler(async (req, res) => {
  const production = await Production.create(req.body);

  res.status(201).json({
    success: true,
    item: production,
  });
});

const updateProduction = asyncHandler(async (req, res) => {
  const production = await Production.findById(req.params.id);

  if (!production) {
    res.status(404);
    throw new Error("Predstava nije pronađena.");
  }

  Object.assign(production, req.body);

  await production.save();

  const updatedProduction = await Production.findById(production._id)
    .populate("poster")
    .populate("gallery")
    .populate("venue")
    .populate("creativeTeam.artist")
    .populate("cast.artists");

  res.json({
    success: true,
    item: updatedProduction,
  });
});

const deleteProduction = asyncHandler(async (req, res) => {
  const production = await Production.findById(req.params.id);

  if (!production) {
    res.status(404);
    throw new Error("Predstava nije pronađena.");
  }

  await production.deleteOne();

  res.json({
    success: true,
    message: "Predstava je obrisana.",
  });
});

module.exports = {
  getProductions,
  getProductionById,
  createProduction,
  updateProduction,
  deleteProduction,
};
