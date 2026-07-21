const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const connectDB = require("../config/db");
const Artist = require("../models/Artist");
const News = require("../models/News");
const Production = require("../models/Production");
const StaticPage = require("../models/StaticPage");

const galleryItemsFromLegacy = (gallery) => (gallery || []).map((media, index) => ({
  media,
  caption: "",
  credit: "",
  altText: "",
  displayOrder: index,
}));

const migrateCollection = async (Model, transform) => {
  const documents = await Model.find({});
  let changed = 0;

  for (const document of documents) {
    const updates = transform(document);
    if (!updates) continue;
    Object.assign(document, updates);
    await document.save();
    changed += 1;
  }

  return { scanned: documents.length, changed };
};

const migrate = async () => {
  try {
    await connectDB();

    const productionResult = await migrateCollection(Production, (item) => {
      const updates = {};
      if (!item.galleryItems?.length && item.gallery?.length) {
        updates.galleryItems = galleryItemsFromLegacy(item.gallery);
      }
      if (!item.videos?.length && item.videoUrls?.length) {
        updates.videos = item.videoUrls.map((video, index) => ({
          provider: "external",
          title: video.label || "",
          url: video.url,
          isTrailer: index === 0,
          displayOrder: index,
        }));
      }
      if (item.creativeTeam?.some((credit) => !credit.label && credit.role)) {
        updates.creativeTeam = item.creativeTeam.map((credit, index) => ({
          ...credit.toObject(),
          roleKey: credit.roleKey || "other",
          label: credit.label || credit.role,
          displayOrder: credit.displayOrder ?? credit.order ?? index,
        }));
      }
      return Object.keys(updates).length ? updates : null;
    });

    const artistResult = await migrateCollection(Artist, (item) => (
      !item.galleryItems?.length && item.gallery?.length
        ? { galleryItems: galleryItemsFromLegacy(item.gallery) }
        : null
    ));
    const newsResult = await migrateCollection(News, (item) => (
      !item.galleryItems?.length && item.gallery?.length
        ? { galleryItems: galleryItemsFromLegacy(item.gallery) }
        : null
    ));
    const pageResult = await migrateCollection(StaticPage, (item) => (
      !item.galleryItems?.length && item.gallery?.length
        ? { galleryItems: galleryItemsFromLegacy(item.gallery) }
        : null
    ));

    console.log("Structured content migration completed.");
    console.log({ productions: productionResult, artists: artistResult, news: newsResult, pages: pageResult });
    process.exit(0);
  } catch (error) {
    console.error("Structured content migration failed:", error);
    process.exit(1);
  }
};

migrate();
