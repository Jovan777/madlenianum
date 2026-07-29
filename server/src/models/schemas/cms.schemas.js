const mongoose = require("mongoose");

const CONTENT_STATUSES = ["draft", "published", "archived"];

const isHttpUrl = (value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isSafeLink = (value) => !value || String(value).startsWith("/") || isHttpUrl(value);

const optionalUrl = {
  validator: isHttpUrl,
  message: "URL mora koristiti HTTP ili HTTPS protokol.",
};

const seoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    keywords: [{ type: String, trim: true }],
    canonicalUrl: { type: String, trim: true, default: "", validate: optionalUrl },
    noIndex: { type: Boolean, default: false },
    translations: {
      en: {
        title: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" },
        keywords: [{ type: String, trim: true }],
        canonicalUrl: { type: String, trim: true, default: "", validate: optionalUrl },
      },
    },
  },
  { _id: false }
);

const galleryItemSchema = new mongoose.Schema(
  {
    media: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      required: [true, "Slika galerije je obavezna."],
    },
    caption: { type: String, trim: true, default: "" },
    credit: { type: String, trim: true, default: "" },
    altText: { type: String, trim: true, default: "" },
    translations: {
      en: {
        caption: { type: String, trim: true, default: "" },
        credit: { type: String, trim: true, default: "" },
        altText: { type: String, trim: true, default: "" },
      },
    },
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const externalLinkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, required: [true, "Naziv linka je obavezan."] },
    url: {
      type: String,
      trim: true,
      required: [true, "URL je obavezan."],
      validate: optionalUrl,
    },
    type: { type: String, trim: true, default: "other" },
    displayOrder: { type: Number, min: 0, default: 0 },
    enabled: { type: Boolean, default: true },
    translations: {
      en: { label: { type: String, trim: true, default: "" } },
    },
  },
  { _id: true }
);

const auditFields = {
  publishedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
};

const contentStatusField = {
  type: String,
  enum: CONTENT_STATUSES,
  default: "draft",
};

module.exports = {
  CONTENT_STATUSES,
  auditFields,
  contentStatusField,
  externalLinkSchema,
  galleryItemSchema,
  isHttpUrl,
  isSafeLink,
  optionalUrl,
  seoSchema,
};
