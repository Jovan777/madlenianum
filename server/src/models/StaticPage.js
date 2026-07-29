const mongoose = require("mongoose");
const slugify = require("../utils/slugify");
const { sanitizeRichText } = require("../services/richText.service");
const { detectVideoProvider } = require("../services/video.service");
const {
  auditFields,
  contentStatusField,
  externalLinkSchema,
  galleryItemSchema,
  isHttpUrl,
  isSafeLink,
  seoSchema,
} = require("./schemas/cms.schemas");

const ABOUT_SECTION_TYPES = ["hero", "text-image", "timeline", "features", "video", "quote", "gallery"];

const timelineItemSchema = new mongoose.Schema(
  {
    period: { type: String, trim: true, required: [true, "Godina ili period su obavezni."] },
    title: { type: String, trim: true, required: [true, "Naslov vremenske stavke je obavezan."] },
    description: { type: String, trim: true, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const featureItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: [true, "Naslov karakteristike je obavezan."] },
    description: { type: String, trim: true, default: "" },
    iconKey: { type: String, trim: true, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const pageSectionSchema = new mongoose.Schema(
  {
    sectionType: { type: String, enum: ABOUT_SECTION_TYPES, required: true },
    enabled: { type: Boolean, default: true },
    heading: { type: String, trim: true, default: "" },
    eyebrow: { type: String, trim: true, default: "" },
    subtitle: { type: String, trim: true, default: "" },
    body: { type: String, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    backgroundImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    imagePosition: { type: String, enum: ["left", "right"], default: "right" },
    caption: { type: String, trim: true, default: "" },
    ctaLabel: { type: String, trim: true, default: "" },
    ctaUrl: { type: String, trim: true, default: "", validate: { validator: isSafeLink, message: "CTA URL nije ispravan." } },
    videoUrl: { type: String, trim: true, default: "" },
    videoTitle: { type: String, trim: true, default: "" },
    quote: { type: String, trim: true, default: "" },
    authorName: { type: String, trim: true, default: "" },
    authorRole: { type: String, trim: true, default: "" },
    timelineItems: [timelineItemSchema],
    featureItems: [featureItemSchema],
    galleryItems: [galleryItemSchema],
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const additionalContactSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, required: true },
    value: { type: String, trim: true, required: true },
    type: { type: String, enum: ["text", "phone", "email", "url"], default: "text" },
    link: { type: String, trim: true, default: "" },
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const contactDataSchema = new mongoose.Schema(
  {
    introduction: { type: String, default: "" },
    mapUrl: { type: String, trim: true, default: "", validate: { validator: isHttpUrl, message: "Map URL nije ispravan." } },
    officeHours: { type: String, trim: true, default: "" },
    ticketOfficeHours: { type: String, trim: true, default: "" },
    additionalItems: [additionalContactSchema],
    contactFormEnabled: { type: Boolean, default: true },
    recipientEmails: [{ type: String, lowercase: true, trim: true }],
  },
  { _id: false }
);

const translationSchema = new mongoose.Schema(
  {
    slug: { type: String, lowercase: true, trim: true },
    title: String,
    body: String,
    sections: [mongoose.Schema.Types.Mixed],
    contact: mongoose.Schema.Types.Mixed,
    seoTitle: String,
    seoDescription: String,
  },
  { _id: false }
);

const staticPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Naslov strane je obavezan."], trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    body: { type: String, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    galleryItems: [galleryItemSchema],
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    pageType: {
      type: String,
      enum: ["about", "founder", "venue_rental", "contact", "ticket_terms", "how_to_buy", "press", "friends", "archive", "custom"],
      default: "custom",
    },
    sections: [pageSectionSchema],
    contact: { type: contactDataSchema, default: () => ({}) },
    translations: { sr: translationSchema, en: translationSchema },
    seo: { type: seoSchema, default: () => ({}) },
    status: contentStatusField,
    ...auditFields,
  },
  { timestamps: true }
);

staticPageSchema.pre("validate", function () {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  if (this.isModified("slug") && this.slug) this.slug = slugify(this.slug);
  if (this.translations?.en) {
    this.translations.en.slug = this.translations.en.slug ? slugify(this.translations.en.slug) : undefined;
    this.translations.en.body = sanitizeRichText(this.translations.en.body);
    if (this.translations.en.contact) {
      this.translations.en.contact.introduction = sanitizeRichText(this.translations.en.contact.introduction);
    }
    for (const section of this.translations.en.sections || []) {
      section.body = sanitizeRichText(section.body);
    }
  }
  this.body = sanitizeRichText(this.body);

  if (this.contact) this.contact.introduction = sanitizeRichText(this.contact.introduction);

  for (const section of this.sections || []) {
    section.body = sanitizeRichText(section.body);
    if (section.sectionType === "video" && section.videoUrl && !["youtube", "vimeo"].includes(detectVideoProvider(section.videoUrl))) {
      this.invalidate("sections", "Video sekcija podrzava samo YouTube i Vimeo URL.");
      break;
    }
  }

  const sectionOrders = (this.sections || []).map((section) => section.displayOrder);
  if (new Set(sectionOrders).size !== sectionOrders.length && sectionOrders.length > 1) {
    this.invalidate("sections", "Redosled sekcija mora biti jedinstven.");
  }
});

staticPageSchema.index({ pageType: 1, status: 1 });
staticPageSchema.index({ status: 1, title: 1 });
staticPageSchema.index({ "translations.en.slug": 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("StaticPage", staticPageSchema, "static_pages");
module.exports.ABOUT_SECTION_TYPES = ABOUT_SECTION_TYPES;
