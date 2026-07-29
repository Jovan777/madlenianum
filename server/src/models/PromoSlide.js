const mongoose = require("mongoose");
const slugify = require("../utils/slugify");
const {
  auditFields,
  contentStatusField,
  isHttpUrl,
} = require("./schemas/cms.schemas");

const translationSchema = new mongoose.Schema(
  { slug: String, title: String, subtitle: String, description: String, linkLabel: String },
  { _id: false }
);

const promoSlideSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Naziv slajda je obavezan."], trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    subtitle: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    linkLabel: { type: String, trim: true, default: "" },
    linkUrl: { type: String, trim: true, default: "" },
    relatedProduction: { type: mongoose.Schema.Types.ObjectId, ref: "Production" },
    relatedEvent: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    activeFrom: Date,
    activeUntil: Date,
    translations: { sr: translationSchema, en: translationSchema },
    language: { type: String, enum: ["sr", "en", "und"], default: "sr" },
    status: contentStatusField,
    ...auditFields,
  },
  { timestamps: true }
);

promoSlideSchema.pre("validate", function () {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  if (this.isModified("slug") && this.slug) this.slug = slugify(this.slug);
  if (this.translations?.en?.slug) this.translations.en.slug = slugify(this.translations.en.slug);
  if (this.linkUrl && !this.linkUrl.startsWith("/") && !isHttpUrl(this.linkUrl)) {
    this.invalidate("linkUrl", "Link mora biti interna putanja ili HTTP/HTTPS URL.");
  }
  if (this.activeFrom && this.activeUntil && this.activeUntil < this.activeFrom) {
    this.invalidate("activeUntil", "Kraj prikaza mora biti posle pocetka.");
  }
});

promoSlideSchema.index({ status: 1, activeFrom: 1, activeUntil: 1 });

module.exports = mongoose.model("PromoSlide", promoSlideSchema, "promo_slides");
