const mongoose = require("mongoose");
const slugify = require("../utils/slugify");

const translationSchema = new mongoose.Schema(
  {
    title: String,
    subtitle: String,
    body: String,
    seoTitle: String,
    seoDescription: String,
  },
  { _id: false }
);

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Naslov vesti je obavezan."],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["vest", "kritika", "press", "akcija", "premijera", "ostalo"],
      default: "vest",
    },
    body: {
      type: String,
      default: "",
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },
    gallery: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    attachment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },
    relatedProduction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Production",
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    translations: {
      sr: translationSchema,
      en: translationSchema,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // izbaciti
    weight: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

newsSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }

  next();
});

module.exports = mongoose.model("News", newsSchema, "news");
