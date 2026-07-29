const mongoose = require("mongoose");
const { sanitizeRichText } = require("../services/richText.service");
const { isHttpUrl, seoSchema } = require("./schemas/cms.schemas");

const selectionSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    mode: { type: String, enum: ["automatic", "manual"], default: "automatic" },
    heading: { type: String, trim: true, default: "" },
    limit: { type: Number, min: 1, max: 24, default: 6 },
  },
  { _id: false }
);

const heroSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    mode: { type: String, enum: ["automatic", "manual"], default: "automatic" },
    limit: { type: Number, min: 1, max: 12, default: 5 },
    selectedSlides: [{ type: mongoose.Schema.Types.ObjectId, ref: "PromoSlide" }],
    fallbackToAutomatic: { type: Boolean, default: true },
  },
  { _id: false }
);

const upcomingEventsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    mode: { type: String, enum: ["automatic", "manual"], default: "automatic" },
    heading: { type: String, trim: true, default: "Repertoar" },
    limit: { type: Number, min: 1, max: 24, default: 8 },
    selectedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    dateFrom: Date,
    dateTo: Date,
  },
  { _id: false }
);

const featuredProductionsSchema = new mongoose.Schema(
  {
    ...selectionSchema.obj,
    selectedProductions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Production" }],
    allowedTypes: [{ type: String, trim: true }],
  },
  { _id: false }
);

const repertoireProductionsSchema = new mongoose.Schema(
  {
    ...selectionSchema.obj,
    selectedProductions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Production" }],
    allowedTypes: [{ type: String, trim: true }],
  },
  { _id: false }
);

const featuredNewsSchema = new mongoose.Schema(
  {
    ...selectionSchema.obj,
    selectedNews: [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }],
    category: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const teaserSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    heading: { type: String, trim: true, default: "" },
    text: { type: String, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    ctaLabel: { type: String, trim: true, default: "" },
    ctaUrl: { type: String, trim: true, default: "" },
    linkedPage: { type: mongoose.Schema.Types.ObjectId, ref: "StaticPage" },
  },
  { _id: false }
);

const ctaCardSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    text: { type: String, trim: true, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    linkLabel: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    enabled: { type: Boolean, default: true },
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const sectionSchema = new mongoose.Schema(
  {
    sectionType: {
      type: String,
      enum: ["hero", "upcomingEvents", "repertoireProductions", "featuredProductions", "featuredNews", "institutionalTeaser", "ctaCards"],
      required: true,
    },
    enabled: { type: Boolean, default: true },
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const homepageTranslationSchema = new mongoose.Schema({
  upcomingEventsHeading: { type: String, trim: true, default: "" },
  repertoireProductionsHeading: { type: String, trim: true, default: "" },
  featuredProductionsHeading: { type: String, trim: true, default: "" },
  featuredNewsHeading: { type: String, trim: true, default: "" },
  institutionalTeaser: {
    heading: { type: String, trim: true, default: "" },
    text: { type: String, default: "" },
    ctaLabel: { type: String, trim: true, default: "" },
  },
  ctaCardsHeading: { type: String, trim: true, default: "" },
  ctaCards: [{
    sourceId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, trim: true, default: "" },
    text: { type: String, trim: true, default: "" },
    linkLabel: { type: String, trim: true, default: "" },
  }],
  seoTitle: { type: String, trim: true, default: "" },
  seoDescription: { type: String, trim: true, default: "" },
}, { _id: false });

const homepageConfigSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ["default"], unique: true, default: "default", immutable: true },
    hero: { type: heroSchema, default: () => ({}) },
    upcomingEvents: { type: upcomingEventsSchema, default: () => ({}) },
    repertoireProductions: { type: repertoireProductionsSchema, default: () => ({ heading: "Sta je na repertoaru", limit: 8 }) },
    featuredProductions: { type: featuredProductionsSchema, default: () => ({ heading: "Predstave" }) },
    featuredNews: { type: featuredNewsSchema, default: () => ({ heading: "Aktuelno" }) },
    institutionalTeaser: { type: teaserSchema, default: () => ({}) },
    ctaCardsHeading: { type: String, trim: true, default: "Istrazite Madlenianum" },
    ctaCards: [ctaCardSchema],
    sections: [sectionSchema],
    seo: { type: seoSchema, default: () => ({}) },
    translations: { sr: homepageTranslationSchema, en: homepageTranslationSchema },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: true }
);

homepageConfigSchema.pre("validate", function () {
  this.key = "default";
  this.institutionalTeaser.text = sanitizeRichText(this.institutionalTeaser.text);
  if (this.translations?.en?.institutionalTeaser) {
    this.translations.en.institutionalTeaser.text = sanitizeRichText(this.translations.en.institutionalTeaser.text);
  }

  const urls = [this.institutionalTeaser.ctaUrl, ...(this.ctaCards || []).map((card) => card.url)];
  if (urls.some((url) => url && !url.startsWith("/") && !isHttpUrl(url))) {
    this.invalidate("ctaCards", "CTA link mora biti interna putanja ili HTTP/HTTPS URL.");
  }

  const sectionTypes = (this.sections || []).map((section) => section.sectionType);
  if (new Set(sectionTypes).size !== sectionTypes.length) {
    this.invalidate("sections", "Svaka pocetna sekcija moze biti navedena samo jednom.");
  }
});

module.exports = mongoose.model("HomepageConfig", homepageConfigSchema, "homepage_configs");
