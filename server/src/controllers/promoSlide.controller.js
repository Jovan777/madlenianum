const asyncHandler = require("../utils/asyncHandler");
const PromoSlide = require("../models/PromoSlide");
const { promoSlideDto } = require("../services/cmsDto.service");
const { applyAudit, applyPublishing, createHttpError, escapeRegex, paginationFrom, sendList } = require("../services/cms.service");

const populateSlide = (query) => query
  .populate("image")
  .populate({ path: "relatedProduction", populate: { path: "poster" } })
  .populate({ path: "relatedEvent", populate: [{ path: "production" }, { path: "venue" }] });

const getPromoSlides = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.language) filter.language = req.query.language;
  if (req.query.q) {
    const search = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ title: search }, { subtitle: search }, { description: search }];
  }
  const [total, slides] = await Promise.all([
    PromoSlide.countDocuments(filter),
    populateSlide(PromoSlide.find(filter).sort("-updatedAt").skip(skip).limit(limit)),
  ]);
  sendList(res, { items: slides, total, page, limit });
});

const getPromoSlideById = asyncHandler(async (req, res) => {
  const slide = await populateSlide(PromoSlide.findById(req.params.id));
  if (!slide) throw createHttpError(404, "Slajd nije pronadjen.");
  res.json({ success: true, item: slide });
});

const previewPromoSlide = asyncHandler(async (req, res) => {
  const slide = await populateSlide(PromoSlide.findById(req.params.id));
  if (!slide) throw createHttpError(404, "Slajd nije pronadjen.");
  res.json({ success: true, preview: true, robots: "noindex,nofollow", item: promoSlideDto(slide) });
});

const createPromoSlide = asyncHandler(async (req, res) => {
  const slide = new PromoSlide(req.body);
  applyAudit(slide, req.admin, { isNew: true });
  applyPublishing(slide);
  await slide.save();
  res.status(201).json({ success: true, item: await populateSlide(PromoSlide.findById(slide._id)) });
});

const updatePromoSlide = asyncHandler(async (req, res) => {
  const slide = await PromoSlide.findById(req.params.id);
  if (!slide) throw createHttpError(404, "Slajd nije pronadjen.");
  const previousStatus = slide.status;
  Object.assign(slide, req.body);
  applyAudit(slide, req.admin);
  applyPublishing(slide, previousStatus);
  await slide.save();
  res.json({ success: true, item: await populateSlide(PromoSlide.findById(slide._id)) });
});

const archivePromoSlide = asyncHandler(async (req, res) => {
  const slide = await PromoSlide.findById(req.params.id);
  if (!slide) throw createHttpError(404, "Slajd nije pronadjen.");
  slide.status = "archived";
  applyAudit(slide, req.admin);
  await slide.save();
  res.json({ success: true, message: "Slajd je arhiviran.", item: slide });
});

const deletePromoSlide = asyncHandler(async (req, res) => {
  const slide = await PromoSlide.findById(req.params.id);
  if (!slide) throw createHttpError(404, "Slajd nije pronadjen.");
  await slide.deleteOne();
  res.json({ success: true, message: "Slajd je obrisan." });
});

module.exports = {
  archivePromoSlide,
  createPromoSlide,
  deletePromoSlide,
  getPromoSlideById,
  getPromoSlides,
  previewPromoSlide,
  updatePromoSlide,
};
