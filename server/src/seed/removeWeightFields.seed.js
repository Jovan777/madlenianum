const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const connectDB = require("../config/db");

const Artist = require("../models/Artist");
const News = require("../models/News");
const PriceCategory = require("../models/PriceCategory");
const Production = require("../models/Production");
const PromoSlide = require("../models/PromoSlide");
const StaticPage = require("../models/StaticPage");
const Venue = require("../models/Venue");

const collections = [
  ["artists", Artist],
  ["news", News],
  ["pricecategories", PriceCategory],
  ["productions", Production],
  ["promo_slides", PromoSlide],
  ["static_pages", StaticPage],
  ["venues", Venue],
];

const removeWeightFields = async () => {
  try {
    await connectDB();

    for (const [collectionName, Model] of collections) {
      const result = await Model.collection.updateMany({}, { $unset: { weight: "" } });
      console.log(
        `${collectionName}: matched ${result.matchedCount}, modified ${result.modifiedCount}`
      );
    }

    console.log("Removed legacy weight fields.");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Failed to remove weight fields:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

removeWeightFields();
