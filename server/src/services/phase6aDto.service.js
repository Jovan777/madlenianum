const { mediaDto, productionSummaryDto, seoDto, venueDto } = require("./cmsDto.service");
const { INQUIRY_STATUS_LABELS } = require("../constants/phase6a.constants");

const idOf = (value) => {
  if (!value) return null;
  return String(value._id || value.id || value);
};

const plain = (value) => {
  if (!value) return null;
  return typeof value.toObject === "function" ? value.toObject({ virtuals: true }) : value;
};

const galleryDto = (item = {}) => {
  const structured = Array.isArray(item.galleryItems) ? item.galleryItems : [];
  if (structured.length) {
    return structured
      .map((entry, index) => ({
        id: idOf(entry),
        media: mediaDto(entry.media),
        caption: entry.caption || "",
        credit: entry.credit || "",
        altText: entry.altText || "",
        displayOrder: entry.displayOrder ?? index,
      }))
      .filter((entry) => entry.media)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }
  return (item.gallery || []).map((media, index) => ({
    id: `legacy-${idOf(media)}`,
    media: mediaDto(media),
    caption: media?.caption || "",
    credit: media?.credit || "",
    altText: media?.altText || media?.alt || "",
    displayOrder: index,
  }));
};

const costumeDto = (value, { admin = false } = {}) => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item);
  return {
    id: idOf(item),
    title: item.title,
    slug: item.slug,
    shortDescription: item.shortDescription || "",
    description: item.description || "",
    mainImage: mediaDto(item.mainImage),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    gender: item.gender,
    epoch: item.epoch || "",
    size: item.size || "",
    color: item.color || "",
    material: item.material || "",
    inventoryNumber: item.inventoryNumber || "",
    condition: item.condition,
    availabilityNote: item.availabilityNote || "",
    relatedProduction: productionSummaryDto(item.relatedProduction),
    isFeatured: Boolean(item.isFeatured),
    displayOrder: item.displayOrder || 0,
    seo: seoDto(item.seo),
    ...(admin ? {
      status: item.status,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } : {}),
  };
};

const propScenographyDto = (value, { admin = false } = {}) => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item);
  return {
    id: idOf(item),
    title: item.title,
    slug: item.slug,
    itemType: item.itemType,
    description: item.description || "",
    mainImage: mediaDto(item.mainImage),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    category: item.category || "",
    epochOrStyle: item.epochOrStyle || "",
    dimensions: {
      widthCm: item.dimensions?.widthCm,
      heightCm: item.dimensions?.heightCm,
      depthCm: item.dimensions?.depthCm,
      note: item.dimensions?.note || "",
    },
    material: item.material || "",
    weight: item.weight,
    inventoryNumber: item.inventoryNumber || "",
    condition: item.condition,
    availabilityNote: item.availabilityNote || "",
    relatedProduction: productionSummaryDto(item.relatedProduction),
    isFeatured: Boolean(item.isFeatured),
    displayOrder: item.displayOrder || 0,
    seo: seoDto(item.seo),
    ...(admin ? {
      status: item.status,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } : {}),
  };
};

const rentalSpaceDto = (value, { admin = false } = {}) => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item);
  return {
    id: idOf(item),
    title: item.title,
    slug: item.slug,
    shortDescription: item.shortDescription || "",
    description: item.description || "",
    heroImage: mediaDto(item.heroImage),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    seatedCapacity: item.seatedCapacity || 0,
    standingCapacity: item.standingCapacity || 0,
    areaSqm: item.areaSqm || 0,
    amenities: item.amenities || [],
    technicalEquipment: item.technicalEquipment || [],
    suitableEventTypes: item.suitableEventTypes || [],
    accessibilityInfo: item.accessibilityInfo || "",
    dressingRooms: item.dressingRooms || "",
    cateringInfo: item.cateringInfo || "",
    barInfo: item.barInfo || "",
    internetInfo: item.internetInfo || "",
    avInfo: item.avInfo || "",
    floorPlanPdf: mediaDto(item.floorPlanPdf),
    linkedVenue: venueDto(item.linkedVenue),
    isFeatured: Boolean(item.isFeatured),
    displayOrder: item.displayOrder || 0,
    seo: seoDto(item.seo),
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
