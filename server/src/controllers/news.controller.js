const asyncHandler = require("../utils/asyncHandler");
const News = require("../models/News");

const getNewsList = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  if (req.query.isFeatured !== undefined) {
    filter.isFeatured = req.query.isFeatured === "true";
  }

  if (req.query.q) {
    filter.$or = [
      { title: new RegExp(req.query.q, "i") },
      { subtitle: new RegExp(req.query.q, "i") },
      { body: new RegExp(req.query.q, "i") },
    ];
  }

  const total = await News.countDocuments(filter);

  const news = await News.find(filter)
    .populate("image")
    .populate("gallery")
    .populate("attachment")
    .populate("relatedProduction")
    .sort("-publishedAt")
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: news,
  });
});

const getNewsById = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id)
    .populate("image")
    .populate("gallery")
    .populate("attachment")
    .populate("relatedProduction");

  if (!news) {
    res.status(404);
    throw new Error("Vest nije pronađena.");
  }

  res.json({
    success: true,
    item: news,
  });
});

const createNews = asyncHandler(async (req, res) => {
  const news = await News.create(req.body);

  res.status(201).json({
    success: true,
    item: news,
  });
});

const updateNews = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id);

  if (!news) {
    res.status(404);
    throw new Error("Vest nije pronađena.");
  }

  Object.assign(news, req.body);
  await news.save();

  const updatedNews = await News.findById(news._id)
    .populate("image")
    .populate("gallery")
    .populate("attachment")
    .populate("relatedProduction");

  res.json({
    success: true,
    item: updatedNews,
  });
});

const deleteNews = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id);

  if (!news) {
    res.status(404);
    throw new Error("Vest nije pronađena.");
  }

  await news.deleteOne();

  res.json({
    success: true,
    message: "Vest je obrisana.",
  });
});

module.exports = {
  getNewsList,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
};