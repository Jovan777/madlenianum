const mongoose = require("mongoose");
const slugify = require("../utils/slugify");

const translationSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    linkLabel: String,
  },
  { _id: false }
);

const promoSlideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Naziv slajda je obavezan."],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },
    linkLabel: {
      type: String,
      default: "",
    },
    linkUrl: {
      type: String,
      default: "",
    },
    relatedProduction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Production",
    },
    translations: {
      sr: translationSchema,
      en: translationSchema,
    },
    language: {
      type: String,
      enum: ["sr", "en", "und"],
      default: "sr",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    weight: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

promoSlideSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }

  next();
});

module.exports = mongoose.model("PromoSlide", promoSlideSchema, "promo_slides");
