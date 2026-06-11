const asyncHandler = require("../utils/asyncHandler");

const Artist = require("../models/Artist");
const Production = require("../models/Production");
const Event = require("../models/Event");
const News = require("../models/News");
const PromoSlide = require("../models/PromoSlide");
const StaticPage = require("../models/StaticPage");
const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const ContactMessage = require("../models/ContactMessage");

const getHome = asyncHandler(async (req, res) => {
  const now = new Date();

  const [slides, featuredNews, upcomingEvents, featuredProductions] = await Promise.all([
    PromoSlide.find({ status: "published" })
      .sort("weight -createdAt")
      .limit(8)
      .populate("image")
      .populate("relatedProduction"),

    News.find({ status: "published", isFeatured: true })
      .sort("weight -publishedAt")
      .limit(6)
      .populate("image")
      .populate("relatedProduction"),

    Event.find({
      status: "scheduled",
      startsAt: { $gte: now },
    })
      .sort("startsAt")
      .limit(8)
      .populate({
        path: "production",
        populate: [{ path: "poster" }],
      })
      .populate("venue"),

    Production.find({
      status: "published",
      isFeatured: true,
    })
      .sort("weight title")
      .limit(8)
      .populate("poster")
      .populate("venue"),
  ]);

  res.json({
    success: true,
    data: {
      slides,
      featuredNews,
      upcomingEvents,
      featuredProductions,
    },
  });
});

const getRepertoire = asyncHandler(async (req, res) => {
  const now = new Date();

  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const from = new Date(year, month - 1, 1, 0, 0, 0);
  const to = new Date(year, month, 1, 0, 0, 0);

  const events = await Event.find({
    status: "scheduled",
    startsAt: {
      $gte: from,
      $lt: to,
    },
  })
    .sort("startsAt")
    .populate({
      path: "production",
      match: { status: "published" },
      populate: [{ path: "poster" }],
    })
    .populate("venue");

  res.json({
    success: true,
    data: {
      month,
      year,
      events: events.filter((event) => event.production),
    },
  });
});

const listProductions = asyncHandler(async (req, res) => {
  const filter = {
    status: "published",
  };

  if (req.query.type) {
    filter.type = req.query.type;
  }

  if (req.query.isOnRepertoire !== undefined) {
    filter.isOnRepertoire = req.query.isOnRepertoire === "true";
  }

  if (req.query.q) {
    filter.$or = [
      { title: new RegExp(req.query.q, "i") },
      { authorComposer: new RegExp(req.query.q, "i") },
      { description: new RegExp(req.query.q, "i") },
    ];
  }

  const items = await Production.find(filter)
    .sort("weight title")
    .populate("poster")
    .populate("venue");

  res.json({
    success: true,
    items,
  });
});

const getProductionBySlug = asyncHandler(async (req, res) => {
  const production = await Production.findOne({
    slug: req.params.slug,
    status: "published",
  })
    .populate("poster")
    .populate("gallery")
    .populate("venue")
    .populate("creativeTeam.artist")
    .populate("cast.artists");

  if (!production) {
    res.status(404);
    throw new Error("Predstava nije pronađena.");
  }

  const upcomingEvents = await Event.find({
    production: production._id,
    status: "scheduled",
    startsAt: { $gte: new Date() },
  })
    .sort("startsAt")
    .populate("venue");

  res.json({
    success: true,
    item: production,
    upcomingEvents,
  });
});

const listArtists = asyncHandler(async (req, res) => {
  const filter = {
    status: "published",
  };

  if (req.query.q) {
    filter.$or = [
      { displayName: new RegExp(req.query.q, "i") },
      { biography: new RegExp(req.query.q, "i") },
      { professions: new RegExp(req.query.q, "i") },
    ];
  }

  const items = await Artist.find(filter)
    .sort("weight displayName")
    .populate("image");

  res.json({
    success: true,
    items,
  });
});

const getArtistBySlug = asyncHandler(async (req, res) => {
  const artist = await Artist.findOne({
    slug: req.params.slug,
    status: "published",
  })
    .populate("image")
    .populate("gallery");

  if (!artist) {
    res.status(404);
    throw new Error("Umetnik nije pronađen.");
  }

  const productions = await Production.find({
    status: "published",
    $or: [
      { "creativeTeam.artist": artist._id },
      { "cast.artists": artist._id },
    ],
  })
    .sort("title")
    .populate("poster")
    .populate("venue");

  res.json({
    success: true,
    item: artist,
    productions,
  });
});

const listNews = asyncHandler(async (req, res) => {
  const filter = {
    status: "published",
  };

  if (req.query.category) {
    filter.category = req.query.category;
  }

  const items = await News.find(filter)
    .sort("-publishedAt")
    .populate("image")
    .populate("relatedProduction");

  res.json({
    success: true,
    items,
  });
});

const getNewsBySlug = asyncHandler(async (req, res) => {
  const item = await News.findOne({
    slug: req.params.slug,
    status: "published",
  })
    .populate("image")
    .populate("gallery")
    .populate("attachment")
    .populate("relatedProduction");

  if (!item) {
    res.status(404);
    throw new Error("Vest nije pronađena.");
  }

  res.json({
    success: true,
    item,
  });
});

const getPageBySlug = asyncHandler(async (req, res) => {
  const item = await StaticPage.findOne({
    slug: req.params.slug,
    status: "published",
  })
    .populate("image")
    .populate("gallery")
    .populate("attachments");

  if (!item) {
    res.status(404);
    throw new Error("Strana nije pronađena.");
  }

  res.json({
    success: true,
    item,
  });
});

const subscribeNewsletter = asyncHandler(async (req, res) => {
  const { email, fullName, language } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email je obavezan.");
  }

  const subscriber = await NewsletterSubscriber.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      email: email.toLowerCase(),
      fullName: fullName || "",
      language: language || "sr",
      status: "active",
      source: "website",
      consentAt: new Date(),
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );

  res.status(201).json({
    success: true,
    item: subscriber,
  });
});

const sendContactMessage = asyncHandler(async (req, res) => {
  const item = await ContactMessage.create({
    fullName: req.body.fullName,
    email: req.body.email,
    phone: req.body.phone || "",
    subject: req.body.subject || "",
    message: req.body.message,
    sourcePage: req.body.sourcePage || "",
  });

  res.status(201).json({
    success: true,
    item,
  });
});

module.exports = {
  getHome,
  getRepertoire,
  listProductions,
  getProductionBySlug,
  listArtists,
  getArtistBySlug,
  listNews,
  getNewsBySlug,
  getPageBySlug,
  subscribeNewsletter,
  sendContactMessage,
};