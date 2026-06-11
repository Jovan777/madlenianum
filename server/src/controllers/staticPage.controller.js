const asyncHandler = require("../utils/asyncHandler");
const StaticPage = require("../models/StaticPage");

const getStaticPages = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.pageType) filter.pageType = req.query.pageType;

  if (req.query.q) {
    filter.$or = [
      { title: new RegExp(req.query.q, "i") },
      { body: new RegExp(req.query.q, "i") },
    ];
  }

  const pages = await StaticPage.find(filter)
    .populate("image")
    .populate("gallery")
    .populate("attachments")
    .sort("weight title");

  res.json({
    success: true,
    items: pages,
  });
});

const getStaticPageById = asyncHandler(async (req, res) => {
  const page = await StaticPage.findById(req.params.id)
    .populate("image")
    .populate("gallery")
    .populate("attachments");

  if (!page) {
    res.status(404);
    throw new Error("Strana nije pronađena.");
  }

  res.json({
    success: true,
    item: page,
  });
});

const createStaticPage = asyncHandler(async (req, res) => {
  const page = await StaticPage.create(req.body);

  res.status(201).json({
    success: true,
    item: page,
  });
});

const updateStaticPage = asyncHandler(async (req, res) => {
  const page = await StaticPage.findById(req.params.id);

  if (!page) {
    res.status(404);
    throw new Error("Strana nije pronađena.");
  }

  Object.assign(page, req.body);
  await page.save();

  const updatedPage = await StaticPage.findById(page._id)
    .populate("image")
    .populate("gallery")
    .populate("attachments");

  res.json({
    success: true,
    item: updatedPage,
  });
});

const deleteStaticPage = asyncHandler(async (req, res) => {
  const page = await StaticPage.findById(req.params.id);

  if (!page) {
    res.status(404);
    throw new Error("Strana nije pronađena.");
  }

  await page.deleteOne();

  res.json({
    success: true,
    message: "Strana je obrisana.",
  });
});

module.exports = {
  getStaticPages,
  getStaticPageById,
  createStaticPage,
  updateStaticPage,
  deleteStaticPage,
};