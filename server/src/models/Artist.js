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

const translationSchema = new mongoose.Schema(
  {
    displayName: String,
    biography: String,
    seoTitle: String,
    seoDescription: String,
  },
  { _id: false }
);

const artistSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: [true, "Ime i prezime umetnika je obavezno."],
      trim: true,
    },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    professions: [{ type: String, trim: true }],
    biography: { type: String, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    galleryItems: [galleryItemSchema],
    links: [externalLinkSchema],
    translations: { sr: translationSchema, en: translationSchema },
    seo: { type: seoSchema, default: () => ({}) },
    status: contentStatusField,
    ...auditFields,
  },
  { timestamps: true }
);

artistSchema.pre("validate", function () {
  if (!this.slug && this.displayName) this.slug = slugify(this.displayName);
  if (this.isModified("slug") && this.slug) this.slug = slugify(this.slug);
  this.biography = sanitizeRichText(this.biography);

  const galleryIds = (this.galleryItems || []).map((item) => String(item.media));
  if (new Set(galleryIds).size !== galleryIds.length) {
    this.invalidate("galleryItems", "Ista slika ne moze biti dodata u galeriju vise puta.");
  }
});

artistSchema.index({ status: 1, displayName: 1 });
artistSchema.index({ professions: 1, status: 1 });

module.exports = mongoose.model("Artist", artistSchema, "artists");
