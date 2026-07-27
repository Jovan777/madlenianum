const mongoose = require("mongoose");
const slugify = require("../utils/slugify");
const { sanitizeRichText } = require("../services/richText.service");
const {
  COSTUME_GENDERS,
  FUNDUS_CONDITIONS,
} = require("../constants/phase6a.constants");
const {
  auditFields,
  contentStatusField,
  galleryItemSchema,
  seoSchema,
} = require("./schemas/cms.schemas");

const costumeItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Naziv kostima je obavezan."], trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    shortDescription: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    mainImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    galleryItems: [galleryItemSchema],
    gender: { type: String, enum: COSTUME_GENDERS, default: "unisex" },
    epoch: { type: String, trim: true, default: "" },
    size: { type: String, trim: true, default: "" },
    color: { type: String, trim: true, default: "" },
    material: { type: String, trim: true, default: "" },
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

costumeItemSchema.pre("validate", function () {
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

costumeItemSchema.index({ status: 1, publishedAt: -1 });
costumeItemSchema.index({ status: 1, gender: 1, epoch: 1 });
costumeItemSchema.index({ status: 1, isFeatured: -1, displayOrder: 1, title: 1 });

module.exports = mongoose.model("CostumeItem", costumeItemSchema, "costumeitems");
