const mongoose = require("mongoose");

const priceCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Price category code is required."],
      trim: true,
      uppercase: true,
      set: (value) => String(value || "").trim().toUpperCase(),
      match: [/^[A-Z0-9_-]+$/, "Code may contain only letters, numbers, underscore and dash."],
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
