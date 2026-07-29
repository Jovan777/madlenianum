const asyncHandler = require("../utils/asyncHandler");
const News = require("../models/News");
const { newsDto } = require("../services/cmsDto.service");
const { populateNews } = require("../services/cmsPopulate.service");
const { assignLocalizedPayload } = require("../services/localizedContent.service");
const {
  applyAudit,
  applyPublishing,
  createHttpError,
  escapeRegex,
  paginationFrom,
  sendList,
} = require("../services/cms.service");

const buildFilter = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === "true";
  if (query.from || query.to) {
    filter.publishedAt = {};
    if (query.from) filter.publishedAt.$gte = new Date(query.from);
    if (query.to) filter.publishedAt.$lte = new Date(query.to);
  }
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ title: search }, { subtitle: search }, { excerpt: search }];
  }
  return filter;
};

const getNewsList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query);
  const filter = buildFilter(req.query);
  const sortMap = { oldest: "publishedAt", updated: "-updatedAt", title: "title" };
  const sort = sortMap[req.query.sort] || "-publishedAt -createdAt";
  const [total, news] = await Promise.all([
    News.countDocuments(filter),
    populateNews(News.find(filter).sort(sort).skip(skip).limit(limit)),
  ]);
  sendList(res, { items: news, total, page, limit });
});

const getNewsById = asyncHandler(async (req, res) => {
  const news = await populateNews(News.findById(req.params.id));
  if (!news) throw createHttpError(404, "Vest nije pronadjena.");
  res.json({ success: true, item: news });
});

const previewNews = asyncHandler(async (req, res) => {
  const news = await populateNews(News.findById(req.params.id));
  if (!news) throw createHttpError(404, "Vest nije pronadjena.");
  res.json({ success: true, preview: true, robots: "noindex,nofollow", item: newsDto(news, req.query.lang) });
});

const createNews = asyncHandler(async (req, res) => {
  const news = new News(req.body);
  applyAudit(news, req.admin, { isNew: true });
  applyPublishing(news);
  await news.save();
  const item = await populateNews(News.findById(news._id));
  res.status(201).json({ success: true, item });
});

const updateNews = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id);
  if (!news) throw createHttpError(404, "Vest nije pronadjena.");
  const previousStatus = news.status;
  assignLocalizedPayload(news, req.body);
  applyAudit(news, req.admin);
  applyPublishing(news, previousStatus);
  await news.save();
  const item = await populateNews(News.findById(news._id));
  res.json({ success: true, item });
});

const archiveNews = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id);
  if (!news) throw createHttpError(404, "Vest nije pronadjena.");
  news.status = "archived";
  applyAudit(news, req.admin);
  await news.save();
  res.json({ success: true, message: "Vest je arhivirana.", item: news });
});

const deleteNews = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id);
  if (!news) throw createHttpError(404, "Vest nije pronadjena.");
  await news.deleteOne();
  res.json({ success: true, message: "Vest je obrisana." });
});

module.exports = {
  archiveNews,
  createNews,
  deleteNews,
  getNewsById,
  getNewsList,
  previewNews,
  updateNews,
};
