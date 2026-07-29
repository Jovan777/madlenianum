const { mediaDto, productionSummaryDto, publicTranslations, seoDto, venueDto } = require("./cmsDto.service");
const { INQUIRY_STATUS_LABELS } = require("../constants/phase6a.constants");
const { localizedArray, localizedSeo, localizedValue, normalizeLocale, translationMeta } = require("./locale.service");

const idOf = (value) => {
  if (!value) return null;
  return String(value._id || value.id || value);
};

const plain = (value) => {
  if (!value) return null;
  return typeof value.toObject === "function" ? value.toObject({ virtuals: true }) : value;
};

const galleryDto = (item = {}, locale = "sr") => {
  const structured = Array.isArray(item.galleryItems) ? item.galleryItems : [];
  if (structured.length) {
    return structured
      .map((entry, index) => ({
        id: idOf(entry),
        media: mediaDto(entry.media, locale),
        caption: normalizeLocale(locale) === "en" ? entry.translations?.en?.caption || entry.caption || "" : entry.caption || "",
        credit: normalizeLocale(locale) === "en" ? entry.translations?.en?.credit || entry.credit || "" : entry.credit || "",
        altText: normalizeLocale(locale) === "en" ? entry.translations?.en?.altText || entry.altText || "" : entry.altText || "",
        displayOrder: entry.displayOrder ?? index,
      }))
      .filter((entry) => entry.media)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }
  return (item.gallery || []).map((media, index) => ({
    id: `legacy-${idOf(media)}`,
    media: mediaDto(media, locale),
    caption: media?.caption || "",
    credit: media?.credit || "",
    altText: media?.altText || media?.alt || "",
    displayOrder: index,
  }));
};

const costumeDto = (value, { admin = false, locale = "sr" } = {}) => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item, locale);
  return {
    id: idOf(item),
    title: localizedValue(item, "title", locale),
    slug: localizedValue(item, "slug", locale),
    shortDescription: localizedValue(item, "shortDescription", locale),
    description: localizedValue(item, "description", locale),
    mainImage: mediaDto(item.mainImage, locale),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    gender: item.gender,
    epoch: localizedValue(item, "epoch", locale),
    size: localizedValue(item, "size", locale),
    color: localizedValue(item, "color", locale),
    material: localizedValue(item, "material", locale),
    inventoryNumber: item.inventoryNumber || "",
    condition: item.condition,
    availabilityNote: localizedValue(item, "availabilityNote", locale),
    relatedProduction: productionSummaryDto(item.relatedProduction, locale),
    isFeatured: Boolean(item.isFeatured),
    displayOrder: item.displayOrder || 0,
    seo: { ...seoDto(item.seo, locale), ...localizedSeo(item, locale) },
    translations: publicTranslations(item.translations),
    ...translationMeta(item, ["title", "slug"]),
    locale: normalizeLocale(locale),
    ...(admin ? {
      status: item.status,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } : {}),
  };
};

const propScenographyDto = (value, { admin = false, locale = "sr" } = {}) => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item, locale);
  return {
    id: idOf(item),
    title: localizedValue(item, "title", locale),
    slug: localizedValue(item, "slug", locale),
    itemType: item.itemType,
    description: localizedValue(item, "description", locale),
    mainImage: mediaDto(item.mainImage, locale),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    category: localizedValue(item, "category", locale),
    epochOrStyle: localizedValue(item, "epochOrStyle", locale),
    dimensions: {
      widthCm: item.dimensions?.widthCm,
      heightCm: item.dimensions?.heightCm,
      depthCm: item.dimensions?.depthCm,
      note: normalizeLocale(locale) === "en" ? item.translations?.en?.dimensionsNote || item.dimensions?.note || "" : item.dimensions?.note || "",
    },
    material: localizedValue(item, "material", locale),
    weight: item.weight,
    inventoryNumber: item.inventoryNumber || "",
    condition: item.condition,
    availabilityNote: localizedValue(item, "availabilityNote", locale),
    relatedProduction: productionSummaryDto(item.relatedProduction, locale),
    isFeatured: Boolean(item.isFeatured),
    displayOrder: item.displayOrder || 0,
    seo: { ...seoDto(item.seo, locale), ...localizedSeo(item, locale) },
    translations: publicTranslations(item.translations),
    ...translationMeta(item, ["title", "slug"]),
    locale: normalizeLocale(locale),
    ...(admin ? {
      status: item.status,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } : {}),
  };
};

const rentalSpaceDto = (value, { admin = false, locale = "sr" } = {}) => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item, locale);
  return {
    id: idOf(item),
    title: localizedValue(item, "title", locale),
    slug: localizedValue(item, "slug", locale),
    shortDescription: localizedValue(item, "shortDescription", locale),
    description: localizedValue(item, "description", locale),
    heroImage: mediaDto(item.heroImage, locale),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    seatedCapacity: item.seatedCapacity || 0,
    standingCapacity: item.standingCapacity || 0,
    areaSqm: item.areaSqm || 0,
    amenities: localizedArray(item, "amenities", locale),
    technicalEquipment: localizedArray(item, "technicalEquipment", locale),
    suitableEventTypes: localizedArray(item, "suitableEventTypes", locale),
    accessibilityInfo: localizedValue(item, "accessibilityInfo", locale),
    dressingRooms: localizedValue(item, "dressingRooms", locale),
    cateringInfo: localizedValue(item, "cateringInfo", locale),
    barInfo: localizedValue(item, "barInfo", locale),
    internetInfo: localizedValue(item, "internetInfo", locale),
    avInfo: localizedValue(item, "avInfo", locale),
    floorPlanPdf: mediaDto(item.floorPlanPdf, locale),
    linkedVenue: venueDto(item.linkedVenue, locale),
    isFeatured: Boolean(item.isFeatured),
    displayOrder: item.displayOrder || 0,
    seo: { ...seoDto(item.seo, locale), ...localizedSeo(item, locale) },
    translations: publicTranslations(item.translations),
    ...translationMeta(item, ["title", "slug"]),
    locale: normalizeLocale(locale),
    ...(admin ? {
      status: item.status,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } : {}),
  };
};

const inquiryBaseDto = (item, { admin = false } = {}) => ({
  id: idOf(item),
  referenceNumber: item.referenceNumber,
  firstName: item.firstName || "",
  lastName: item.lastName || "",
  companyName: item.companyName || "",
  email: item.email || "",
  phone: item.phone || "",
  desiredDate: item.desiredDate,
  approximateGuestCount: item.approximateGuestCount,
  note: item.note || "",
  status: item.status,
  statusLabel: INQUIRY_STATUS_LABELS[item.status] || item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  locale: item.locale || "sr",
  ...(admin ? {
    internalNotes: item.internalNotes || "",
    emailDelivery: item.emailDelivery || {},
    statusHistory: item.statusHistory || [],
  } : {}),
});

const rentalInquiryDto = (value, { admin = false } = {}) => {
  const item = plain(value);
  if (!item) return null;
  return {
    ...inquiryBaseDto(item, { admin }),
    rentalSpace: admin ? rentalSpaceDto(item.rentalSpace, { admin: true }) : undefined,
    rentalSpaceSnapshot: item.rentalSpaceSnapshot || null,
  };
};

const eventPlanningInquiryDto = (value, { admin = false } = {}) => {
  const item = plain(value);
  if (!item) return null;
  const preferredSnapshot = item.preferredRentalSpaceSnapshot?.title || item.preferredRentalSpaceSnapshot?.slug
    ? item.preferredRentalSpaceSnapshot
    : null;
  return {
    ...inquiryBaseDto(item, { admin }),
    preferredRentalSpace: admin ? rentalSpaceDto(item.preferredRentalSpace, { admin: true }) : undefined,
    preferredRentalSpaceSnapshot: preferredSnapshot,
    eventType: item.eventType || "",
  };
};

module.exports = {
  costumeDto,
  eventPlanningInquiryDto,
  galleryDto,
  propScenographyDto,
  rentalInquiryDto,
  rentalSpaceDto,
};
