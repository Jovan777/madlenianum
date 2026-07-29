require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Artist = require("../models/Artist");
const CostumeItem = require("../models/CostumeItem");
const Event = require("../models/Event");
const HomepageConfig = require("../models/HomepageConfig");
const Media = require("../models/Media");
const News = require("../models/News");
const Production = require("../models/Production");
const PromoSlide = require("../models/PromoSlide");
const PropScenographyItem = require("../models/PropScenographyItem");
const RentalSpace = require("../models/RentalSpace");
const SiteSettings = require("../models/SiteSettings");
const StaticPage = require("../models/StaticPage");
const Venue = require("../models/Venue");

const isMeaningful = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
};

const at = (value, path) => path.split(".").reduce((current, key) => current?.[key], value);

const issues = [];

const reportMissing = ({ resource, id, slug, path, source, severity = "content" }) => {
  if (!isMeaningful(source)) return;
  issues.push({
    resource,
    id: String(id),
    slug: slug || "",
    path,
    severity,
    source: Array.isArray(source) ? source.join(" | ") : String(source).slice(0, 180),
  });
};

const auditTranslatedFields = (resource, document, fields, identity = {}) => {
  for (const field of fields) {
    const source = at(document, field);
    const translated = at(document, `translations.en.${field}`);
    if (!isMeaningful(translated)) {
      reportMissing({
        resource,
        id: document._id,
        slug: identity.slug || document.slug,
        path: `translations.en.${field}`,
        source,
        severity: ["slug", "title", "displayName", "name"].includes(field) ? "required" : "content",
      });
    }
  }
};

const auditGallery = (resource, document) => {
  for (const [index, item] of (document.galleryItems || []).entries()) {
    for (const field of ["caption", "credit", "altText"]) {
      if (!isMeaningful(item.translations?.en?.[field])) {
        reportMissing({
          resource,
          id: document._id,
          slug: document.slug,
          path: `galleryItems.${index}.translations.en.${field}`,
          source: item[field],
        });
      }
    }
  }
};

const auditLinks = (resource, document, key) => {
  for (const [index, link] of (document[key] || []).entries()) {
    if (!isMeaningful(link.translations?.en?.label)) {
      reportMissing({
        resource,
        id: document._id,
        slug: document.slug,
        path: `${key}.${index}.translations.en.label`,
        source: link.label,
      });
    }
  }
};

const auditProductions = async () => {
  const documents = await Production.find({ status: "published" }).lean();
  for (const document of documents) {
    auditTranslatedFields("Production", document, [
      "slug",
      "title",
      "authorComposer",
      "originalTitle",
      "subtitle",
      "shortDescription",
      "description",
      "synopsis",
      "performanceLanguage",
      "subtitles",
      "season",
      "tags",
    ]);
    auditGallery("Production", document);

    for (const [index, credit] of (document.creativeTeam || []).entries()) {
      for (const field of ["label", "name", "note"]) {
        if (!isMeaningful(credit.translations?.en?.[field])) {
          reportMissing({
            resource: "Production",
            id: document._id,
            slug: document.slug,
            path: `creativeTeam.${index}.translations.en.${field}`,
            source: credit[field],
          });
        }
      }
    }

    for (const [index, member] of (document.cast || []).entries()) {
      for (const field of ["name", "role", "note"]) {
        if (!isMeaningful(member.translations?.en?.[field])) {
          reportMissing({
            resource: "Production",
            id: document._id,
            slug: document.slug,
            path: `cast.${index}.translations.en.${field}`,
            source: member[field] || (field === "role" ? member.character : ""),
          });
        }
      }
    }

    for (const [index, video] of (document.videos || []).entries()) {
      if (!isMeaningful(video.translations?.en?.title)) {
        reportMissing({
          resource: "Production",
          id: document._id,
          slug: document.slug,
          path: `videos.${index}.translations.en.title`,
          source: video.title,
        });
      }
    }

    for (const [index, review] of (document.reviews || []).entries()) {
      for (const field of ["title", "publication", "note"]) {
        if (!isMeaningful(review.translations?.en?.[field])) {
          reportMissing({
            resource: "Production",
            id: document._id,
            slug: document.slug,
            path: `reviews.${index}.translations.en.${field}`,
            source: review[field],
          });
        }
      }
    }
  }
};

const auditSimpleResources = async () => {
  const resources = [
    [Artist, "Artist", ["slug", "displayName", "professions", "biography"]],
    [News, "News", ["slug", "title", "subtitle", "excerpt", "body", "categoryLabel", "attachmentLabel"]],
    [PromoSlide, "PromoSlide", ["slug", "title", "subtitle", "description", "linkLabel"]],
    [CostumeItem, "CostumeItem", ["slug", "title", "shortDescription", "description", "epoch", "size", "color", "material", "availabilityNote"]],
    [PropScenographyItem, "PropScenographyItem", ["slug", "title", "description", "category", "epochOrStyle", "material", "availabilityNote"]],
    [RentalSpace, "RentalSpace", ["slug", "title", "shortDescription", "description", "amenities", "technicalEquipment", "suitableEventTypes", "accessibilityInfo", "dressingRooms", "cateringInfo", "barInfo", "internetInfo", "avInfo"]],
    [Venue, "Venue", ["slug", "name", "description", "sections"]],
  ];

  for (const [Model, resource, fields] of resources) {
    const documents = await Model.find({ status: "published" }).lean();
    for (const document of documents) {
      auditTranslatedFields(resource, document, fields);
      auditGallery(resource, document);
      if (resource === "Artist") auditLinks(resource, document, "links");
      if (resource === "News") auditLinks(resource, document, "externalLinks");
    }
  }
};

const auditStructuredResources = async () => {
  const pages = await StaticPage.find({ status: "published" }).lean();
  for (const page of pages) {
    auditTranslatedFields("StaticPage", page, ["slug", "title", "body"]);
    const translatedSections = page.translations?.en?.sections || [];
    for (const [sectionIndex, section] of (page.sections || []).entries()) {
      const translatedSection = translatedSections[sectionIndex] || {};
      for (const field of [
        "eyebrow",
        "heading",
        "subtitle",
        "body",
        "caption",
        "videoTitle",
        "quote",
        "authorName",
        "authorRole",
        "ctaLabel",
      ]) {
        if (!isMeaningful(translatedSection[field])) {
          reportMissing({
            resource: "StaticPage",
            id: page._id,
            slug: page.slug,
            path: `translations.en.sections.${sectionIndex}.${field}`,
            source: section[field],
          });
        }
      }
      for (const [itemIndex, item] of (section.timelineItems || []).entries()) {
        const translatedItem = translatedSection.timelineItems?.[itemIndex] || {};
        for (const field of ["period", "title", "description"]) {
          if (!isMeaningful(translatedItem[field])) {
            reportMissing({
              resource: "StaticPage",
              id: page._id,
              slug: page.slug,
              path: `translations.en.sections.${sectionIndex}.timelineItems.${itemIndex}.${field}`,
              source: item[field],
            });
          }
        }
      }
      for (const [itemIndex, item] of (section.featureItems || []).entries()) {
        const translatedItem = translatedSection.featureItems?.[itemIndex] || {};
        for (const field of ["title", "description"]) {
          if (!isMeaningful(translatedItem[field])) {
            reportMissing({
              resource: "StaticPage",
              id: page._id,
              slug: page.slug,
              path: `translations.en.sections.${sectionIndex}.featureItems.${itemIndex}.${field}`,
              source: item[field],
            });
          }
        }
      }
      for (const [itemIndex, item] of (section.galleryItems || []).entries()) {
        const translatedItem = translatedSection.galleryItems?.[itemIndex] || {};
        for (const field of ["caption", "credit", "altText"]) {
          if (!isMeaningful(translatedItem[field])) {
            reportMissing({
              resource: "StaticPage",
              id: page._id,
              slug: page.slug,
              path: `translations.en.sections.${sectionIndex}.galleryItems.${itemIndex}.${field}`,
              source: item[field],
            });
          }
        }
      }
    }

    const translatedContact = page.translations?.en?.contact || {};
    for (const field of ["introduction", "officeHours", "ticketOfficeHours"]) {
      if (!isMeaningful(translatedContact[field])) {
        reportMissing({
          resource: "StaticPage",
          id: page._id,
          slug: page.slug,
          path: `translations.en.contact.${field}`,
          source: page.contact?.[field],
        });
      }
    }
    for (const [itemIndex, item] of (page.contact?.additionalItems || []).entries()) {
      const translatedItem = translatedContact.additionalItems?.[itemIndex] || {};
      for (const field of ["label", "value"]) {
        if (!isMeaningful(translatedItem[field])) {
          reportMissing({
            resource: "StaticPage",
            id: page._id,
            slug: page.slug,
            path: `translations.en.contact.additionalItems.${itemIndex}.${field}`,
            source: item[field],
          });
        }
      }
    }
  }

  const homepage = await HomepageConfig.findOne({ key: "default" }).lean();
  if (homepage) {
    auditTranslatedFields("HomepageConfig", homepage, [
      "repertoireHeading",
      "repertoireCtaLabel",
      "newsHeading",
      "newsCtaLabel",
      "institutionalTeaser",
      "ctaCards",
    ]);
  }

  const settings = await SiteSettings.findOne({ key: "default" }).lean();
  if (settings) {
    auditTranslatedFields("SiteSettings", settings, [
      "siteName",
      "siteTagline",
      "footerText",
      "footerNavigation",
      "partnerBrands",
      "maintenanceMessage",
    ]);
  }
};

const auditMediaAndEvents = async () => {
  const mediaItems = await Media.find({}).lean();
  for (const media of mediaItems) {
    for (const field of ["title", "alt", "caption", "credit"]) {
      if (!isMeaningful(media.translations?.en?.[field])) {
        reportMissing({
          resource: "Media",
          id: media._id,
          slug: media.fileName,
          path: `translations.en.${field}`,
          source: media[field],
        });
      }
    }
  }

  const events = await Event.find({ status: { $ne: "cancelled" } }).lean();
  for (const event of events) {
    if (!isMeaningful(event.translations?.en?.badge)) {
      reportMissing({
        resource: "Event",
        id: event._id,
        path: "translations.en.badge",
        source: event.badge,
      });
    }
    if (!isMeaningful(event.translations?.en?.ticketingNote)) {
      reportMissing({
        resource: "Event",
        id: event._id,
        path: "translations.en.ticketingNote",
        source: event.ticketing?.note,
      });
    }
  }
};

const run = async () => {
  await connectDB();
  await auditProductions();
  await auditSimpleResources();
  await auditStructuredResources();
  await auditMediaAndEvents();

  const byResource = Object.groupBy(issues, (issue) => issue.resource);
  const summary = Object.fromEntries(
    Object.entries(byResource).map(([resource, entries]) => [
      resource,
      {
        missing: entries.length,
        required: entries.filter((entry) => entry.severity === "required").length,
      },
    ])
  );

  const compact = process.argv.includes("--compact");
  const strict = process.argv.includes("--strict");
  if (compact) {
    const uniqueSources = Object.fromEntries(
      Object.entries(byResource).map(([resource, entries]) => [
        resource,
        [...new Set(entries.map((entry) => entry.source))].sort(),
      ])
    );
    const missingPaths = Object.fromEntries(
      Object.entries(byResource).map(([resource, entries]) => [
        resource,
        Object.entries(Object.groupBy(entries, (entry) => entry.path))
          .map(([path, pathEntries]) => ({ path, count: pathEntries.length }))
          .sort((left, right) => left.path.localeCompare(right.path)),
      ])
    );
    console.log(JSON.stringify({
      audit: "localization-content",
      totalMissing: issues.length,
      requiredMissing: issues.filter((issue) => issue.severity === "required").length,
      summary,
      missingPaths,
      uniqueSources,
    }, null, 2));
    await mongoose.disconnect();
    if (strict && issues.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  console.log(JSON.stringify({
    audit: "localization-content",
    totalMissing: issues.length,
    requiredMissing: issues.filter((issue) => issue.severity === "required").length,
    summary,
    issues,
  }, null, 2));

  await mongoose.disconnect();
  if (strict && issues.length > 0) {
    process.exitCode = 1;
  }
};

run().catch(async (error) => {
  console.error("Localization content audit failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
