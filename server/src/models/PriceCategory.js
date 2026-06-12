const mongoose = require("mongoose");

const priceCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Price category code is required."],
      trim: true,
      uppercase: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Price category name is required."],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    // izbaciti
    weight: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "PriceCategory",
  priceCategorySchema,
  "pricecategories"
);