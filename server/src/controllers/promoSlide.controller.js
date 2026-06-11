const asyncHandler = require("../utils/asyncHandler");
const PromoSlide = require("../models/PromoSlide");

const getPromoSlides = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.language) filter.language = req.query.language;

  const slides = await PromoSlide.find(filter)
    .populate("image")
    .populate("relatedProduction")
    .sort("weight -createdAt");

  res.json({
    success: true,
    items: slides,
  });
});

const getPromoSlideById = asyncHandler(async (req, res) => {
  const slide = await PromoSlide.findById(req.params.id)
    .populate("image")
    .populate("relatedProduction");

  if (!slide) {
    res.status(404);
    throw new Error("Slajd nije pronađen.");
  }

  res.json({
    success: true,
    item: slide,
  });
});

const createPromoSlide = asyncHandler(async (req, res) => {
  const slide = await PromoSlide.create(req.body);

  res.status(201).json({
    success: true,
    item: slide,
  });
});

const updatePromoSlide = asyncHandler(async (req, res) => {
  const slide = await PromoSlide.findById(req.params.id);

  if (!slide) {
    res.status(404);
    throw new Error("Slajd nije pronađen.");
  }

  Object.assign(slide, req.body);
  await slide.save();

  const updatedSlide = await PromoSlide.findById(slide._id)
    .populate("image")
    .populate("relatedProduction");

  res.json({
    success: true,
    item: updatedSlide,
  });
});

const deletePromoSlide = asyncHandler(async (req, res) => {
  const slide = await PromoSlide.findById(req.params.id);

  if (!slide) {
    res.status(404);
    throw new Error("Slajd nije pronađen.");
  }

  await slide.deleteOne();

  res.json({
    success: true,
    message: "Slajd je obrisan.",
  });
});

module.exports = {
  getPromoSlides,
  getPromoSlideById,
  createPromoSlide,
  updatePromoSlide,
  deletePromoSlide,
};