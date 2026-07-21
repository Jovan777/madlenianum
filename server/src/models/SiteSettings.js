const mongoose = require("mongoose");
const { isHttpUrl, seoSchema } = require("./schemas/cms.schemas");

const contactSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true, default: "" },
    generalEmail: { type: String, lowercase: true, trim: true, default: "" },
    ticketOfficeEmail: { type: String, lowercase: true, trim: true, default: "" },
    phones: [{ type: String, trim: true }],
    ticketOfficePhones: [{ type: String, trim: true }],
  },
  { _id: false }
);

const navLinkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, required: true },
    url: { type: String, trim: true, required: true },
    displayOrder: { type: Number, min: 0, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const footerGroupSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    links: [navLinkSchema],
    displayOrder: { type: Number, min: 0, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const socialSchema = new mongoose.Schema(
  {
    platform: { type: String, trim: true, required: true },
    label: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, required: true, validate: { validator: isHttpUrl, message: "Drustveni link nije ispravan." } },
    displayOrder: { type: Number, min: 0, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const partnerSchema = new mongoose.Schema(
  {
    media: { type: mongoose.Schema.Types.ObjectId, ref: "Media", required: true },
    label: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "", validate: { validator: isHttpUrl, message: "Link partnera nije ispravan." } },
    displayOrder: { type: Number, min: 0, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ["default"], unique: true, default: "default", immutable: true },
    siteName: { type: String, trim: true, default: "Madlenianum" },
    shortDescription: { type: String, trim: true, default: "" },
    mainLogo: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    footerLogo: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    contact: { type: contactSchema, default: () => ({}) },
    socialLinks: [socialSchema],
    legalLinks: [navLinkSchema],
    footerNavigation: [footerGroupSchema],
    partnerLogos: [partnerSchema],
    defaultSeo: { type: seoSchema, default: () => ({}) },
    socialImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    languages: [{ type: String, enum: ["sr", "en"] }],
    defaultLanguage: { type: String, enum: ["sr", "en"], default: "sr" },
    maintenanceMessage: { type: String, trim: true, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: true }
);

siteSettingsSchema.pre("validate", function () {
  this.key = "default";
  const links = [
    ...(this.legalLinks || []),
    ...(this.footerNavigation || []).flatMap((group) => group.links || []),
  ];
  if (links.some((link) => link.url && !link.url.startsWith("/") && !isHttpUrl(link.url))) {
    this.invalidate("footerNavigation", "Navigacioni link mora biti interna putanja ili HTTP/HTTPS URL.");
  }
});

module.exports = mongoose.model("SiteSettings", siteSettingsSchema, "site_settings");
