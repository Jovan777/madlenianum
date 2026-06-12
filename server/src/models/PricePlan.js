const mongoose = require("mongoose");

const priceRuleSchema = new mongoose.Schema(
  {
    priceCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PriceCategory",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    label: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const pricePlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Price plan name is required."],
      trim: true,
    },
    productionTypes: [
      {
        type: String,
        enum: [
          "opera",
          "opereta",
          "balet",
          "drama",
          "mjuzikl",
          "koncert",
          "gostujuca_predstava",
          "ostalo",
        ],
      },
    ],
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
    },
    isPremiere: {
      type: Boolean,
      default: false,
    },
    // srediti currency da se dohvata iz nekog default fila
    currency: {
      type: String,
      default: "RSD",
      uppercase: true,
      trim: true,
    },
    rules: [priceRuleSchema],
    validFrom: Date,
    validTo: Date,
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PricePlan", pricePlanSchema, "priceplans");