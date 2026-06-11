const asyncHandler = require("../utils/asyncHandler");
const NewsletterSubscriber = require("../models/NewsletterSubscriber");

const getNewsletterSubscribers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.language) filter.language = req.query.language;
  if (req.query.source) filter.source = req.query.source;

  if (req.query.q) {
    filter.$or = [
      { email: new RegExp(req.query.q, "i") },
      { fullName: new RegExp(req.query.q, "i") },
    ];
  }

  const total = await NewsletterSubscriber.countDocuments(filter);

  const subscribers = await NewsletterSubscriber.find(filter)
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: subscribers,
  });
});

const getNewsletterSubscriberById = asyncHandler(async (req, res) => {
  const subscriber = await NewsletterSubscriber.findById(req.params.id);

  if (!subscriber) {
    res.status(404);
    throw new Error("Newsletter prijava nije pronađena.");
  }

  res.json({
    success: true,
    item: subscriber,
  });
});

const createNewsletterSubscriber = asyncHandler(async (req, res) => {
  const subscriber = await NewsletterSubscriber.create(req.body);

  res.status(201).json({
    success: true,
    item: subscriber,
  });
});

const updateNewsletterSubscriber = asyncHandler(async (req, res) => {
  const subscriber = await NewsletterSubscriber.findById(req.params.id);

  if (!subscriber) {
    res.status(404);
    throw new Error("Newsletter prijava nije pronađena.");
  }

  Object.assign(subscriber, req.body);
  await subscriber.save();

  res.json({
    success: true,
    item: subscriber,
  });
});

const deleteNewsletterSubscriber = asyncHandler(async (req, res) => {
  const subscriber = await NewsletterSubscriber.findById(req.params.id);

  if (!subscriber) {
    res.status(404);
    throw new Error("Newsletter prijava nije pronađena.");
  }

  await subscriber.deleteOne();

  res.json({
    success: true,
    message: "Newsletter prijava je obrisana.",
  });
});

module.exports = {
  getNewsletterSubscribers,
  getNewsletterSubscriberById,
  createNewsletterSubscriber,
  updateNewsletterSubscriber,
  deleteNewsletterSubscriber,
};