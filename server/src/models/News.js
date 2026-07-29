const mongoose = require("mongoose");
const slugify = require("../utils/slugify");
const { sanitizeRichText } = require("../services/richText.service");
const {
  auditFields,
  contentStatusField,
  externalLinkSchema,
  galleryItemSchema,
  seoSchema,
} = require("./schemas/cms.schemas");

const NEWS_CATEGORIES = [
  "vest",
  "kritika",
  "press",
  "akcija",
  "premijera",
  "najava",
  "obavestenje",
  "promocija",
  "ostalo",
];

const translationSchema = new mongoose.Schema(
  {
    slug: { type: String, lowercase: true, trim: true },
    title: String,
    subtitle: String,
    excerpt: String,
    body: String,
    categoryLabel: String,
    attachmentLabel: String,
    seoTitle: String,
    seoDescription: String,
  },
  { _id: false }
);

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Naslov vesti je obavezan."], trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    subtitle: { type: String, trim: true, default: "" },
    excerpt: { type: String, trim: true, default: "" },
    category: { type: String, enum: NEWS_CATEGORIES, default: "vest" },
    body: { type: String, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    galleryItems: [galleryItemSchema],
    attachment: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    externalLinks: [externalLinkSchema],
    relatedProduction: { type: mongoose.Schema.Types.ObjectId, ref: "Production" },
    translations: { sr: translationSchema, en: translationSchema },
    seo: { type: seoSchema, default: () => ({}) },
    status: contentStatusField,
    isFeatured: { type: Boolean, default: false },
    ...auditFields,
  },
  { timestamps: true }
);

newsSchema.pre("validate", function () {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  if (this.isModified("slug") && this.slug) this.slug = slugify(this.slug);
  if (this.translations?.en) {
    this.translations.en.slug = this.translations.en.slug ? slugify(this.translations.en.slug) : undefined;
    this.translations.en.body = sanitizeRichText(this.translations.en.body);
  }
  this.body = sanitizeRichText(this.body);

  const galleryIds = (this.galleryItems || []).map((item) => String(item.media));
  if (new Set(galleryIds).size !== galleryIds.length) {
    this.invalidate("galleryItems", "Ista slika ne moze biti dodata u galeriju vise puta.");
  }
});

newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ category: 1, status: 1, publishedAt: -1 });
newsSchema.index({ isFeatured: 1, status: 1, publishedAt: -1 });
newsSchema.index({ "translations.en.slug": 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("News", newsSchema, "news");
module.exports.NEWS_CATEGORIES = NEWS_CATEGORIES;
