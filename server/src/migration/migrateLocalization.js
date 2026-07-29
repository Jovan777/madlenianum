require("dotenv").config();

const connectDB = require("../config/db");
const Artist = require("../models/Artist");
const ContactMessage = require("../models/ContactMessage");
const CostumeItem = require("../models/CostumeItem");
const EventPlanningInquiry = require("../models/EventPlanningInquiry");
const Event = require("../models/Event");
const HomepageConfig = require("../models/HomepageConfig");
const Media = require("../models/Media");
const News = require("../models/News");
const Order = require("../models/Order");
const Production = require("../models/Production");
const PromoSlide = require("../models/PromoSlide");
const PropScenographyItem = require("../models/PropScenographyItem");
const RentalInquiry = require("../models/RentalInquiry");
const RentalSpace = require("../models/RentalSpace");
const SiteSettings = require("../models/SiteSettings");
const StaticPage = require("../models/StaticPage");
const Venue = require("../models/Venue");
const seedEnglishContent = require("../seed/seedEnglishContent");

const resourceMappings = [
  [Production, ["slug", "title", "authorComposer", "originalTitle", "subtitle", "shortDescription", "description", "synopsis", "performanceLanguage", "subtitles", "season", "tags"]],
  [Artist, ["slug", "displayName", "professions", "biography"]],
  [News, ["slug", "title", "subtitle", "excerpt", "body"]],
  [PromoSlide, ["slug", "title", "subtitle", "description", "linkLabel"]],
  [StaticPage, ["slug", "title", "body", "sections", "contact"]],
  [Venue, ["slug", "name", "description", "sections"]],
  [CostumeItem, ["slug", "title", "shortDescription", "description", "epoch", "size", "color", "material", "availabilityNote"]],
  [PropScenographyItem, ["slug", "title", "description", "category", "epochOrStyle", "material", "availabilityNote"]],
  [RentalSpace, ["slug", "title", "shortDescription", "description", "amenities", "technicalEquipment", "suitableEventTypes", "accessibilityInfo", "dressingRooms", "cateringInfo", "barInfo", "internetInfo", "avInfo"]],
];

const isEmpty = (value) => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

const translatedStructuredSections = (sections = [], translations = []) => sections.map((section, index) => {
  const translated = translations[index] || {};
  return {
    ...section,
    ...translated,
    timelineItems: (section.timelineItems || []).map((item, itemIndex) => ({
      ...item,
      ...(translated.timelineItems?.[itemIndex] || {}),
    })),
    featureItems: (section.featureItems || []).map((item, itemIndex) => ({
      ...item,
      ...(translated.featureItems?.[itemIndex] || {}),
    })),
  };
});

const curatedEnglishFor = (Model, document) => {
  if (Model === Production) return seedEnglishContent.productions[document.slug];
  if (Model === Artist) return seedEnglishContent.artists[document.slug];
  if (Model === News) return seedEnglishContent.news[document.slug];
  if (Model === PromoSlide) return seedEnglishContent.promoSlides[document.slug];
  if (Model === StaticPage) {
    const translation = seedEnglishContent.staticPages[document.slug];
    if (!translation) return null;
    return {
      ...translation,
      sections: translatedStructuredSections(document.sections, translation.sections),
      contact: translation.contact ? { ...document.contact, ...translation.contact } : undefined,
    };
  }
  if (Model === Venue) {
    const translation = seedEnglishContent.venues[document.slug];
    return translation
      ? { ...translation, sections: translatedStructuredSections(document.sections, translation.sections) }
      : null;
  }
  if (Model === CostumeItem) return seedEnglishContent.costumes[document.inventoryNumber];
  if (Model === PropScenographyItem) return seedEnglishContent.props[document.inventoryNumber];
  if (Model === RentalSpace) return seedEnglishContent.rentalSpaces[document.slug];
  return null;
};

const migrateResource = async (Model, fields) => {
  const documents = await Model.find({}).select([...fields, "inventoryNumber", "translations", "seo"]).lean();
  const operations = [];
  let skipped = 0;
  let englishMigrated = 0;
  const usedEnglishSlugs = new Map(
    documents
      .filter((document) => !isEmpty(document.translations?.en?.slug))
      .map((document) => [document.translations.en.slug, String(document._id)])
  );

  for (const document of documents) {
    const set = {};
    for (const field of fields) {
      const current = document.translations?.sr?.[field];
      if (isEmpty(current) && !isEmpty(document[field])) set[`translations.sr.${field}`] = document[field];
    }
    if (isEmpty(document.translations?.sr?.seoTitle) && document.seo?.title) set["translations.sr.seoTitle"] = document.seo.title;
    if (isEmpty(document.translations?.sr?.seoDescription) && document.seo?.description) set["translations.sr.seoDescription"] = document.seo.description;
    const english = curatedEnglishFor(Model, document);
    let addedEnglish = false;
    for (const [field, value] of Object.entries(english || {})) {
      if (isEmpty(value) || !isEmpty(document.translations?.en?.[field])) continue;
      if (field === "slug") {
        const owner = usedEnglishSlugs.get(value);
        if (owner && owner !== String(document._id)) {
          console.warn(`[localization] Skipped conflicting English slug "${value}" for ${Model.modelName} ${document._id}.`);
          continue;
        }
        usedEnglishSlugs.set(value, String(document._id));
      }
      set[`translations.en.${field}`] = value;
      addedEnglish = true;
    }
    if (addedEnglish) englishMigrated += 1;
    if (Object.keys(set).length) operations.push({ updateOne: { filter: { _id: document._id }, update: { $set: set } } });
    else skipped += 1;
  }

  const result = operations.length ? await Model.bulkWrite(operations, { ordered: false }) : null;
  return {
    scanned: documents.length,
    migrated: result?.modifiedCount || 0,
    englishMigrated,
    skipped,
  };
};

const duplicateEnglishSlugs = async (Model) => Model.aggregate([
  { $match: { "translations.en.slug": { $exists: true, $nin: [null, ""] } } },
  { $group: { _id: "$translations.en.slug", ids: { $push: "$_id" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
]);

const migrateHomepage = async () => {
  const item = await HomepageConfig.findOne({ key: "default" });
  if (!item) return { scanned: 0, migrated: 0, skipped: 0 };
  const set = {};
  const pairs = {
    upcomingEventsHeading: item.upcomingEvents?.heading,
    repertoireProductionsHeading: item.repertoireProductions?.heading,
    featuredProductionsHeading: item.featuredProductions?.heading,
    featuredNewsHeading: item.featuredNews?.heading,
    ctaCardsHeading: item.ctaCardsHeading,
    seoTitle: item.seo?.title,
    seoDescription: item.seo?.description,
  };
  for (const [field, value] of Object.entries(pairs)) {
    if (isEmpty(item.translations?.sr?.[field]) && !isEmpty(value)) set[`translations.sr.${field}`] = value;
  }
  if (isEmpty(item.translations?.sr?.institutionalTeaser?.heading) && item.institutionalTeaser?.heading) set["translations.sr.institutionalTeaser.heading"] = item.institutionalTeaser.heading;
  if (isEmpty(item.translations?.sr?.institutionalTeaser?.text) && item.institutionalTeaser?.text) set["translations.sr.institutionalTeaser.text"] = item.institutionalTeaser.text;
  if (isEmpty(item.translations?.sr?.institutionalTeaser?.ctaLabel) && item.institutionalTeaser?.ctaLabel) set["translations.sr.institutionalTeaser.ctaLabel"] = item.institutionalTeaser.ctaLabel;
  const englishPairs = {
    upcomingEventsHeading: "Upcoming events",
    repertoireProductionsHeading: "On the repertoire",
    featuredProductionsHeading: "Do not miss",
    featuredNewsHeading: "Behind the scenes",
    ctaCardsHeading: "Partnership",
    seoTitle: "Madlenianum Opera & Theatre",
    seoDescription: "Madlenianum Opera and Theatre in Zemun.",
  };
  for (const [field, value] of Object.entries(englishPairs)) {
    if (isEmpty(item.translations?.en?.[field])) set[`translations.en.${field}`] = value;
  }
  if (isEmpty(item.translations?.en?.institutionalTeaser?.heading)) set["translations.en.institutionalTeaser.heading"] = "Madlenianum";
  if (isEmpty(item.translations?.en?.institutionalTeaser?.text)) {
    set["translations.en.institutionalTeaser.text"] = "<p>Madlenianum is where opera, theatre, music and movement meet. In Zemun, we create a programme connecting artists and audiences, tradition and contemporary expression.</p>";
  }
  if (isEmpty(item.translations?.en?.institutionalTeaser?.ctaLabel)) set["translations.en.institutionalTeaser.ctaLabel"] = "About us";
  if (isEmpty(item.translations?.en?.ctaCards)) {
    const cards = [
      ["Guest performances", "Programmes and partnerships that Madlenianum develops with artists and institutions.", "Contact us"],
      ["Venue rental", "Discover the possibilities for organising events in Madlenianum's venues.", "Contact us"],
      ["Costume and prop rental", "Send an enquiry about available costumes and stage props.", "Contact us"],
    ];
    set["translations.en.ctaCards"] = (item.ctaCards || []).map((card, index) => ({
      sourceId: card._id,
      title: cards[index]?.[0] || card.title,
      text: cards[index]?.[1] || card.text,
      linkLabel: cards[index]?.[2] || card.linkLabel,
    }));
  }
  if (Object.keys(set).length) await HomepageConfig.updateOne({ _id: item._id }, { $set: set });
  return { scanned: 1, migrated: Object.keys(set).length ? 1 : 0, skipped: Object.keys(set).length ? 0 : 1 };
};

const migrateSettings = async () => {
  const item = await SiteSettings.findOne({ key: "default" });
  if (!item) return { scanned: 0, migrated: 0, skipped: 0 };
  const set = {};
  const languages = Array.from(new Set([...(item.languages || []), "sr", "en"]));
  if (JSON.stringify(languages) !== JSON.stringify(item.languages || [])) {
    set.languages = languages;
  }
  if (item.defaultLanguage !== "sr") {
    set.defaultLanguage = "sr";
  }
  const pairs = {
    siteName: item.siteName,
    shortDescription: item.shortDescription,
    contactAddress: item.contact?.address,
    fundusResponseTimeText: item.fundusContact?.responseTimeText,
    commercialResponseTimeText: item.commercialContact?.responseTimeText,
    maintenanceMessage: item.maintenanceMessage,
    seoTitle: item.defaultSeo?.title,
    seoDescription: item.defaultSeo?.description,
  };
  for (const [field, value] of Object.entries(pairs)) {
    if (isEmpty(item.translations?.sr?.[field]) && !isEmpty(value)) set[`translations.sr.${field}`] = value;
  }
  const englishPairs = {
    siteName: "Madlenianum",
    shortDescription: "Madlenianum Opera and Theatre in Zemun.",
    contactAddress: "32 Glavna Street, Zemun, Belgrade",
    seoTitle: "Madlenianum Opera & Theatre",
    seoDescription: "Madlenianum Opera and Theatre in Zemun.",
  };
  for (const [field, value] of Object.entries(englishPairs)) {
    if (isEmpty(item.translations?.en?.[field])) set[`translations.en.${field}`] = value;
  }
  if (isEmpty(item.translations?.en?.footerNavigation)) {
    const groups = [
      { title: "Programme", links: ["Repertoire", "Productions"] },
      { title: "Artists", links: ["All artists"] },
      { title: "Madlenianum", links: ["About us", "Contact", "Order lookup"] },
    ];
    set["translations.en.footerNavigation"] = (item.footerNavigation || []).map((group, groupIndex) => ({
      sourceId: group._id,
      title: groups[groupIndex]?.title || group.title,
      links: (group.links || []).map((link, linkIndex) => ({
        sourceId: link._id,
        label: groups[groupIndex]?.links[linkIndex] || link.label,
      })),
    }));
  }
  const result = Object.keys(set).length
    ? await SiteSettings.updateOne({ _id: item._id }, { $set: set })
    : { modifiedCount: 0 };
  return {
    scanned: 1,
    migrated: result.modifiedCount,
    skipped: result.modifiedCount ? 0 : 1,
  };
};

const migrateLocaleDefaults = async () => {
  const models = [Order, ContactMessage, RentalInquiry, EventPlanningInquiry];
  const results = [];
  for (const Model of models) {
    const result = await Model.updateMany({ locale: { $exists: false } }, { $set: { locale: "sr" } });
    results.push({ resource: Model.modelName, migrated: result.modifiedCount });
  }
  return results;
};

const creativeRoleEnglish = {
  writer: "Writer",
  director: "Director",
  composer: "Composer",
  conductor: "Conductor",
  choreographer: "Choreographer",
  dramaturg: "Dramaturge",
  scenographer: "Set designer",
  costumeDesigner: "Costume designer",
  lightingDesigner: "Lighting designer",
  music: "Music",
};

const castRoleEnglish = new Map([
  ["glumac", "Actor"],
  ["glumica", "Actress"],
  ["narator", "Narrator"],
  ["hor", "Choir"],
  ["ansambl", "Ensemble"],
  ["uloga", "Role"],
  ["gospodja", "Lady"],
  ["gost", "Guest"],
  ["darsi", "Darcy"],
]);

const migrateProductionNestedTranslations = async () => {
  const productions = await Production.find({}).select("slug galleryItems creativeTeam cast videos reviews");
  let migrated = 0;
  let skipped = 0;
  let fieldsAdded = 0;

  for (const production of productions) {
    let changed = false;

    for (const credit of production.creativeTeam || []) {
      const label = creativeRoleEnglish[credit.roleKey];
      const translatedLabel = label
        || seedEnglishContent.translateSeedMetadata(credit.label || credit.role || "");
      if (translatedLabel && isEmpty(credit.translations?.en?.label)) {
        credit.set("translations.en.label", translatedLabel);
        fieldsAdded += 1;
        changed = true;
      }
      if (credit.name && isEmpty(credit.translations?.en?.name)) {
        credit.set(
          "translations.en.name",
          seedEnglishContent.translateSeedMetadata(credit.name, { preserveUnknown: true })
        );
        fieldsAdded += 1;
        changed = true;
      }
      const translatedNote = seedEnglishContent.translateSeedMetadata(credit.note || "");
      if (translatedNote && isEmpty(credit.translations?.en?.note)) {
        credit.set("translations.en.note", translatedNote);
        fieldsAdded += 1;
        changed = true;
      }
    }

    for (const member of production.cast || []) {
      const sourceRole = String(member.role || member.character || "").trim().toLocaleLowerCase("sr");
      const role = castRoleEnglish.get(sourceRole)
        || seedEnglishContent.translateSeedMetadata(member.role || member.character || "", { preserveUnknown: true });
      if (role && isEmpty(member.translations?.en?.role)) {
        member.set("translations.en.role", role);
        fieldsAdded += 1;
        changed = true;
      }
      if (member.name && isEmpty(member.translations?.en?.name)) {
        member.set(
          "translations.en.name",
          seedEnglishContent.translateSeedMetadata(member.name, { preserveUnknown: true })
        );
        fieldsAdded += 1;
        changed = true;
      }
      const translatedNote = seedEnglishContent.translateSeedMetadata(member.note || "");
      if (translatedNote && isEmpty(member.translations?.en?.note)) {
        member.set("translations.en.note", translatedNote);
        fieldsAdded += 1;
        changed = true;
      }
    }

    for (const video of production.videos || []) {
      const sourceTitle = String(video.title || "").trim().toLocaleLowerCase("sr");
      const title = ["trejler", "trailer"].includes(sourceTitle)
        ? "Trailer"
        : seedEnglishContent.translateSeedMetadata(video.title || "");
      if (title && isEmpty(video.translations?.en?.title)) {
        video.set("translations.en.title", title);
        fieldsAdded += 1;
        changed = true;
      }
    }

    for (const review of production.reviews || []) {
      for (const field of ["title", "publication", "note"]) {
        const translated = seedEnglishContent.translateSeedMetadata(
          review[field] || "",
          { preserveUnknown: field === "publication" }
        );
        if (translated && isEmpty(review.translations?.en?.[field])) {
          review.set(`translations.en.${field}`, translated);
          fieldsAdded += 1;
          changed = true;
        }
      }
    }

    for (const item of production.galleryItems || []) {
      for (const field of ["caption", "credit", "altText"]) {
        const translated = seedEnglishContent.translateSeedMetadata(
          item[field] || "",
          { preserveUnknown: field === "credit" }
        );
        if (translated && isEmpty(item.translations?.en?.[field])) {
          item.set(`translations.en.${field}`, translated);
          fieldsAdded += 1;
          changed = true;
        }
      }
    }

    if (changed) {
      await production.save();
      migrated += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    scanned: productions.length,
    migrated,
    skipped,
    fieldsAdded,
  };
};

const eventBadgeEnglish = new Map([
  ["premijera", "Premiere"],
  ["gostovanje", "Guest performance"],
  ["rasprodato", "Sold out"],
  ["otkazano", "Cancelled"],
  ["odlozeno", "Postponed"],
  ["odloženo", "Postponed"],
]);

const migrateEventTranslations = async () => {
  const events = await Event.find({}).select("badge ticketing.note translations");
  const operations = [];
  let skipped = 0;

  for (const event of events) {
    const sourceBadge = String(event.badge || "").trim().toLocaleLowerCase("sr");
    const badge = eventBadgeEnglish.get(sourceBadge)
      || seedEnglishContent.translateSeedMetadata(event.badge || "");
    const ticketingNote = seedEnglishContent.translateSeedMetadata(
      event.ticketing?.note || "",
      { preserveUnknown: true }
    );
    const set = {};
    if (badge && isEmpty(event.translations?.en?.badge)) {
      set["translations.en.badge"] = badge;
    }
    if (ticketingNote && isEmpty(event.translations?.en?.ticketingNote)) {
      set["translations.en.ticketingNote"] = ticketingNote;
    }
    if (Object.keys(set).length) {
      operations.push({
        updateOne: {
          filter: { _id: event._id },
          update: { $set: set },
        },
      });
    } else {
      skipped += 1;
    }
  }

  const result = operations.length ? await Event.bulkWrite(operations, { ordered: false }) : null;
  return {
    scanned: events.length,
    migrated: result?.modifiedCount || 0,
    skipped,
  };
};

const galleryModels = [
  Artist,
  News,
  CostumeItem,
  PropScenographyItem,
  RentalSpace,
];

const migrateSharedNestedTranslations = async () => {
  let scanned = 0;
  let migrated = 0;
  let fieldsAdded = 0;

  for (const Model of galleryModels) {
    const documents = await Model.find({});
    for (const document of documents) {
      scanned += 1;
      let changed = false;

      for (const item of document.galleryItems || []) {
        for (const field of ["caption", "credit", "altText"]) {
          const translated = seedEnglishContent.translateSeedMetadata(
            item[field] || "",
            { preserveUnknown: field === "credit" }
          );
          if (translated && isEmpty(item.translations?.en?.[field])) {
            item.set(`translations.en.${field}`, translated);
            fieldsAdded += 1;
            changed = true;
          }
        }
      }

      const links = Model === Artist
        ? document.links || []
        : Model === News
          ? document.externalLinks || []
          : [];
      for (const link of links) {
        const label = seedEnglishContent.translateSeedMetadata(link.label || "");
        if (label && isEmpty(link.translations?.en?.label)) {
          link.set("translations.en.label", label);
          fieldsAdded += 1;
          changed = true;
        }
      }

      if (changed) {
        await document.save();
        migrated += 1;
      }
    }
  }

  return { scanned, migrated, fieldsAdded };
};

const migrateMediaTranslations = async () => {
  const mediaItems = await Media.find({});
  let migrated = 0;
  let fieldsAdded = 0;

  for (const media of mediaItems) {
    const set = {};
    for (const [sourceField, translationField] of [
      ["title", "title"],
      ["alt", "alt"],
      ["caption", "caption"],
      ["credit", "credit"],
    ]) {
      const translated = seedEnglishContent.translateSeedMetadata(
        media[sourceField] || "",
        { preserveUnknown: sourceField === "credit" }
      );
      if (translated && isEmpty(media.translations?.en?.[translationField])) {
        set[`translations.en.${translationField}`] = translated;
        fieldsAdded += 1;
      }
    }
    if (Object.keys(set).length) {
      await Media.updateOne({ _id: media._id }, { $set: set });
      migrated += 1;
    }
  }

  return { scanned: mediaItems.length, migrated, fieldsAdded };
};

const migrateStaticPageNestedMetadata = async () => {
  const pages = await StaticPage.find({});
  let migrated = 0;
  let fieldsAdded = 0;

  for (const page of pages) {
    let changed = false;
    for (const section of page.translations?.en?.sections || []) {
      for (const item of section.galleryItems || []) {
        for (const field of ["caption", "credit", "altText"]) {
          const translated = seedEnglishContent.translateSeedMetadata(
            item[field] || "",
            { preserveUnknown: field === "credit" }
          );
          if (translated && translated !== item[field]) {
            item[field] = translated;
            fieldsAdded += 1;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      page.markModified("translations.en.sections");
      await page.save();
      migrated += 1;
    }
  }

  return { scanned: pages.length, migrated, fieldsAdded };
};

const run = async () => {
  await connectDB();
  const report = [];
  for (const [Model, fields] of resourceMappings) {
    const result = await migrateResource(Model, fields);
    const conflicts = await duplicateEnglishSlugs(Model);
    report.push({ resource: Model.modelName, ...result, englishSlugConflicts: conflicts });
  }
  report.push({ resource: "HomepageConfig", ...(await migrateHomepage()) });
  report.push({ resource: "SiteSettings", ...(await migrateSettings()) });
  report.push({ resource: "ProductionNestedTranslations", ...(await migrateProductionNestedTranslations()) });
  report.push({ resource: "SharedNestedTranslations", ...(await migrateSharedNestedTranslations()) });
  report.push({ resource: "MediaTranslations", ...(await migrateMediaTranslations()) });
  report.push({ resource: "StaticPageNestedMetadata", ...(await migrateStaticPageNestedMetadata()) });
  report.push({ resource: "EventTranslations", ...(await migrateEventTranslations()) });
  const localeDefaults = await migrateLocaleDefaults();

  console.log(JSON.stringify({
    migration: "localization",
    idempotent: true,
    note: "Existing Serbian content was preserved. Curated English translations were added only for known seeded records and only where English fields were empty.",
    resources: report,
    localeDefaults,
  }, null, 2));
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Localization migration failed:", error);
    process.exit(1);
  });
