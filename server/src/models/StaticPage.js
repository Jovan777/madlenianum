const mongoose = require("mongoose");
const slugify = require("../utils/slugify");

const translationSchema = new mongoose.Schema(
  {
    title: String,
    body: String,
    seoTitle: String,
    seoDescription: String,
  },
  { _id: false }
);

const staticPageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Naslov strane je obavezan."],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
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
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    pageType: {
      type: String,
      enum: [
        "about",
        "founder",
        "venue_rental",
        "contact",
        "ticket_terms",
        "how_to_buy",
        "press",
        "friends",
        "archive",
        "custom",
      ],
      default: "custom",
    },
    translations: {
      sr: translationSchema,
      en: translationSchema,
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
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

staticPageSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }

  next();
});

module.exports = mongoose.model("StaticPage", staticPageSchema, "static_pages");
