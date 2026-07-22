const mongoose = require("mongoose");
const { PRICE_PLAN_STATUSES, SUPPORTED_CURRENCIES } = require("../constants/ticketing.constants");

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
      required: [true, "Venue is required."],
    },
    isPremiere: {
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
      default: "RSD",
      enum: SUPPORTED_CURRENCIES,
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
      enum: PRICE_PLAN_STATUSES,
      default: "draft",
    },
    revision: {
      type: Number,
      default: 1,
      min: 1,
    },
    parentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PricePlan",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

pricePlanSchema.index({ venue: 1, status: 1, isPremiere: 1 });
pricePlanSchema.index({ parentPlan: 1, revision: 1 });

module.exports = mongoose.model("PricePlan", pricePlanSchema, "priceplans");
