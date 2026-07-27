const mongoose = require("mongoose");
const slugify = require("../utils/slugify");
const { sanitizeRichText } = require("../services/richText.service");
const {
  FUNDUS_CONDITIONS,
  PROP_SCENOGRAPHY_TYPES,
} = require("../constants/phase6a.constants");
const {
  auditFields,
  contentStatusField,
  galleryItemSchema,
  seoSchema,
} = require("./schemas/cms.schemas");

const dimensionsSchema = new mongoose.Schema(
  {
    widthCm: { type: Number, min: 0 },
    heightCm: { type: Number, min: 0 },
    depthCm: { type: Number, min: 0 },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const propScenographyItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Naziv predmeta je obavezan."], trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    itemType: { type: String, enum: PROP_SCENOGRAPHY_TYPES, required: true },
    description: { type: String, default: "" },
    mainImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    galleryItems: [galleryItemSchema],
    category: { type: String, trim: true, default: "" },
    epochOrStyle: { type: String, trim: true, default: "" },
    dimensions: { type: dimensionsSchema, default: () => ({}) },
    material: { type: String, trim: true, default: "" },
    weight: { type: Number, min: 0 },
    inventoryNumber: {
      type: String,
      required: [true, "Inventarski broj je obavezan."],
      unique: true,
      uppercase: true,
      trim: true,
    },
    condition: { type: String, enum: FUNDUS_CONDITIONS, default: "good" },
    availabilityNote: { type: String, trim: true, default: "" },
    relatedProduction: { type: mongoose.Schema.Types.ObjectId, ref: "Production" },
    status: contentStatusField,
    publishedAt: Date,
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, min: 0, default: 0 },
    seo: { type: seoSchema, default: () => ({}) },
    ...auditFields,
  },
  { timestamps: true }
);

propScenographyItemSchema.pre("validate", function () {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  if (this.isModified("slug") && this.slug) this.slug = slugify(this.slug);
  if (this.inventoryNumber) {
    this.inventoryNumber = String(this.inventoryNumber).trim().toUpperCase();
  }
  this.description = sanitizeRichText(this.description);

  const galleryIds = (this.galleryItems || []).map((item) => String(item.media));
  if (new Set(galleryIds).size !== galleryIds.length) {
    this.invalidate("galleryItems", "Ista slika ne moze biti dodata u galeriju vise puta.");
  }
});

propScenographyItemSchema.index({ status: 1, itemType: 1, publishedAt: -1 });
propScenographyItemSchema.index({ status: 1, category: 1, epochOrStyle: 1 });
propScenographyItemSchema.index({ status: 1, isFeatured: -1, displayOrder: 1, title: 1 });

module.exports = mongoose.model("PropScenographyItem", propScenographyItemSchema, "propscenographyitems");
