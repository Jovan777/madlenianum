const mongoose = require("mongoose");
const slugify = require("../utils/slugify");
const { sanitizeRichText } = require("../services/richText.service");
const {
  auditFields,
  contentStatusField,
  galleryItemSchema,
  seoSchema,
} = require("./schemas/cms.schemas");

const rentalSpaceSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Naziv prostora je obavezan."], trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    shortDescription: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    heroImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    galleryItems: [galleryItemSchema],
    seatedCapacity: { type: Number, min: 0, default: 0 },
    standingCapacity: { type: Number, min: 0, default: 0 },
    areaSqm: { type: Number, min: 0, default: 0 },
    amenities: [{ type: String, trim: true }],
    technicalEquipment: [{ type: String, trim: true }],
    suitableEventTypes: [{ type: String, trim: true }],
    accessibilityInfo: { type: String, trim: true, default: "" },
    dressingRooms: { type: String, trim: true, default: "" },
    cateringInfo: { type: String, trim: true, default: "" },
    barInfo: { type: String, trim: true, default: "" },
    internetInfo: { type: String, trim: true, default: "" },
    avInfo: { type: String, trim: true, default: "" },
    floorPlanPdf: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    linkedVenue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue" },
    status: contentStatusField,
    publishedAt: Date,
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, min: 0, default: 0 },
    seo: { type: seoSchema, default: () => ({}) },
    ...auditFields,
  },
  { timestamps: true }
);

rentalSpaceSchema.pre("validate", function () {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  if (this.isModified("slug") && this.slug) this.slug = slugify(this.slug);
  this.description = sanitizeRichText(this.description);

  const galleryIds = (this.galleryItems || []).map((item) => String(item.media));
  if (new Set(galleryIds).size !== galleryIds.length) {
    this.invalidate("galleryItems", "Ista slika ne moze biti dodata u galeriju vise puta.");
  }
});

rentalSpaceSchema.index({ status: 1, isFeatured: -1, displayOrder: 1, title: 1 });
rentalSpaceSchema.index({ status: 1, seatedCapacity: 1, standingCapacity: 1 });

module.exports = mongoose.model("RentalSpace", rentalSpaceSchema, "rentalspaces");
