const asyncHandler = require("../utils/asyncHandler");
const RentalSpace = require("../models/RentalSpace");
const RentalInquiry = require("../models/RentalInquiry");
const EventPlanningInquiry = require("../models/EventPlanningInquiry");
const {
  applyAudit,
  applyPublishing,
  createHttpError,
  escapeRegex,
  paginationFrom,
  publicPublishedFilter,
  sendList,
} = require("../services/cms.service");
const {
  buildContentFilter,
  buildInquiryFilter,
  isObjectId,
  pagedQuery,
  validateInquiryTransition,
} = require("../services/phase6aAdmin.service");
const {
  populateEventPlanningInquiry,
  populateRentalInquiry,
  populateRentalSpace,
} = require("../services/phase6aPopulate.service");
const {
  eventPlanningInquiryDto,
  rentalInquiryDto,
  rentalSpaceDto,
} = require("../services/phase6aDto.service");
const { sendInquiryNotification } = require("../services/inquiryEmail.service");

const contentSortFor = (value) => {
  const map = {
    title: "title",
    newest: "-createdAt",
    featured: "-isFeatured displayOrder title",
    display: "displayOrder title",
  };
  return map[value] || "displayOrder title";
};

const inquirySortFor = (value) => {
  const map = {
    oldest: "createdAt",
    desiredDate: "desiredDate createdAt",
    updated: "-updatedAt",
    newest: "-createdAt",
  };
  return map[value] || "-createdAt";
};

const publicRentalSpaceFilter = (query) => {
  const filter = publicPublishedFilter();
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === "true";
  if (query.minSeatedCapacity) filter.seatedCapacity = { $gte: Number(query.minSeatedCapacity) || 0 };
  if (query.minStandingCapacity) filter.standingCapacity = { $gte: Number(query.minStandingCapacity) || 0 };
  if (query.eventType) filter.suitableEventTypes = query.eventType;
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$and = [{ $or: [{ title: search }, { shortDescription: search }, { description: search }] }];
  }
  return filter;
};

const listPublicRentalSpaces = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query, { limit: 12 });
  const filter = publicRentalSpaceFilter(req.query);
  const [items, total] = await Promise.all([
    populateRentalSpace(RentalSpace.find(filter).sort(contentSortFor(req.query.sort)).skip(skip).limit(limit)),
    RentalSpace.countDocuments(filter),
  ]);
  sendList(res, { items: items.map((item) => rentalSpaceDto(item)), total, page, limit });
});

const getPublicRentalSpace = asyncHandler(async (req, res) => {
  const item = await populateRentalSpace(RentalSpace.findOne({ slug: req.params.slug, ...publicPublishedFilter() }));
  if (!item) throw createHttpError(404, "Prostor nije pronadjen.");
  res.json({ success: true, item: rentalSpaceDto(item) });
});

const listRentalSpaces = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query);
  const filter = buildContentFilter(req.query, []);
  if (req.query.linkedVenue) {
    if (!isObjectId(req.query.linkedVenue)) filter._id = null;
    else filter.linkedVenue = req.query.linkedVenue;
  }
  const [items, total] = await Promise.all([
    populateRentalSpace(RentalSpace.find(filter).sort(contentSortFor(req.query.sort)).skip(skip).limit(limit)),
    RentalSpace.countDocuments(filter),
  ]);
  sendList(res, { items: items.map((item) => rentalSpaceDto(item, { admin: true })), total, page, limit });
});

const getRentalSpaceById = asyncHandler(async (req, res) => {
  const item = await populateRentalSpace(RentalSpace.findById(req.params.id));
  if (!item) throw createHttpError(404, "Prostor nije pronadjen.");
  res.json({ success: true, item: rentalSpaceDto(item, { admin: true }) });
});

const previewRentalSpace = asyncHandler(async (req, res) => {
  const item = await populateRentalSpace(RentalSpace.findById(req.params.id));
  if (!item) throw createHttpError(404, "Prostor nije pronadjen.");
  res.json({ success: true, preview: true, robots: "noindex,nofollow", item: rentalSpaceDto(item) });
});

const createRentalSpace = asyncHandler(async (req, res) => {
  const item = new RentalSpace(req.body);
  applyAudit(item, req.admin, { isNew: true });
  applyPublishing(item);
  await item.save();
  const populated = await populateRentalSpace(RentalSpace.findById(item._id));
  res.status(201).json({ success: true, item: rentalSpaceDto(populated, { admin: true }) });
});

const updateRentalSpace = asyncHandler(async (req, res) => {
  const item = await RentalSpace.findById(req.params.id);
  if (!item) throw createHttpError(404, "Prostor nije pronadjen.");
  const previousStatus = item.status;
  Object.assign(item, req.body);
  applyAudit(item, req.admin);
  applyPublishing(item, previousStatus);
  await item.save();
  const populated = await populateRentalSpace(RentalSpace.findById(item._id));
  res.json({ success: true, item: rentalSpaceDto(populated, { admin: true }) });
});

const publishRentalSpace = asyncHandler(async (req, res) => {
  const item = await RentalSpace.findById(req.params.id);
  if (!item) throw createHttpError(404, "Prostor nije pronadjen.");
  item.status = "published";
  applyAudit(item, req.admin);
  applyPublishing(item, "draft");
  await item.save();
  const populated = await populateRentalSpace(RentalSpace.findById(item._id));
  res.json({ success: true, message: "Prostor je objavljen.", item: rentalSpaceDto(populated, { admin: true }) });
});

const archiveRentalSpace = asyncHandler(async (req, res) => {
  const item = await RentalSpace.findById(req.params.id);
  if (!item) throw createHttpError(404, "Prostor nije pronadjen.");
  item.status = "archived";
  applyAudit(item, req.admin);
  await item.save();
  const populated = await populateRentalSpace(RentalSpace.findById(item._id));
  res.json({ success: true, message: "Prostor je arhiviran.", item: rentalSpaceDto(populated, { admin: true }) });
});

const deleteRentalSpace = asyncHandler(async (req, res) => {
  const item = await RentalSpace.findById(req.params.id);
  if (!item) throw createHttpError(404, "Prostor nije pronadjen.");
  const usage = {
    rentalInquiries: await RentalInquiry.countDocuments({ rentalSpace: item._id }),
    eventPlanningInquiries: await EventPlanningInquiry.countDocuments({ preferredRentalSpace: item._id }),
  };
  if (usage.rentalInquiries || usage.eventPlanningInquiries) {
    throw createHttpError(409, "Prostor ne moze biti obrisan jer postoje upiti koji ga koriste.", {
      usage,
      recommendation: "Arhivirajte prostor da biste sacuvali istoriju upita.",
    });
  }
  await item.deleteOne();
  res.json({ success: true, message: "Prostor je obrisan." });
});

const createRentalInquiry = asyncHandler(async (req, res) => {
  const rentalSpace = await RentalSpace.findOne({
    _id: req.body.rentalSpace,
    ...publicPublishedFilter(),
  });
  if (!rentalSpace) throw createHttpError(404, "Prostor nije pronadjen ili nije javno dostupan.");

  const payload = {
    rentalSpace: rentalSpace._id,
    rentalSpaceSnapshot: {
      rentalSpaceId: rentalSpace._id,
      title: rentalSpace.title,
      slug: rentalSpace.slug,
      seatedCapacity: rentalSpace.seatedCapacity,
      standingCapacity: rentalSpace.standingCapacity,
    },
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    companyName: req.body.companyName || "",
    email: req.body.email,
    phone: req.body.phone,
    desiredDate: req.body.desiredDate,
    approximateGuestCount: req.body.approximateGuestCount,
    note: req.body.note || "",
    status: "new",
    statusHistory: [{ toStatus: "new", source: "public", reason: "Public rental inquiry submitted." }],
    idempotencyKey: req.body.idempotencyKey || req.headers["idempotency-key"] || undefined,
  };

  if (payload.idempotencyKey) {
    const existing = await populateRentalInquiry(
      RentalInquiry.findOne({ idempotencyKey: payload.idempotencyKey }).select("+idempotencyKey")
    );
    if (existing) {
      return res.json({ success: true, idempotent: true, item: rentalInquiryDto(existing) });
    }
  }

  const inquiry = new RentalInquiry(payload);
  await inquiry.save();
  await sendInquiryNotification(inquiry, "rental");
  const populated = await populateRentalInquiry(RentalInquiry.findById(inquiry._id));
  res.status(201).json({
    success: true,
    message: "Upit je sacuvan. Madlenianum tim ce vas kontaktirati.",
    item: rentalInquiryDto(populated),
    emailStatus: populated.emailDelivery?.status,
  });
});

const createEventPlanningInquiry = asyncHandler(async (req, res) => {
  let preferredRentalSpace = null;
  if (req.body.preferredRentalSpace) {
    preferredRentalSpace = await RentalSpace.findOne({
      _id: req.body.preferredRentalSpace,
      ...publicPublishedFilter(),
    });
    if (!preferredRentalSpace) throw createHttpError(404, "Izabrani prostor nije javno dostupan.");
  }

  const payload = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    companyName: req.body.companyName || "",
    email: req.body.email,
    phone: req.body.phone,
    desiredDate: req.body.desiredDate,
    approximateGuestCount: req.body.approximateGuestCount,
    preferredRentalSpace: preferredRentalSpace?._id,
    preferredRentalSpaceSnapshot: preferredRentalSpace ? {
      title: preferredRentalSpace.title,
      slug: preferredRentalSpace.slug,
    } : undefined,
    eventType: req.body.eventType || "",
    note: req.body.note || "",
    status: "new",
    statusHistory: [{ toStatus: "new", source: "public", reason: "Public event planning inquiry submitted." }],
    idempotencyKey: req.body.idempotencyKey || req.headers["idempotency-key"] || undefined,
  };

  if (payload.idempotencyKey) {
    const existing = await populateEventPlanningInquiry(
      EventPlanningInquiry.findOne({ idempotencyKey: payload.idempotencyKey }).select("+idempotencyKey")
    );
    if (existing) {
      return res.json({ success: true, idempotent: true, item: eventPlanningInquiryDto(existing) });
    }
  }

  const inquiry = new EventPlanningInquiry(payload);
  await inquiry.save();
  await sendInquiryNotification(inquiry, "eventPlanning");
  const populated = await populateEventPlanningInquiry(EventPlanningInquiry.findById(inquiry._id));
  res.status(201).json({
    success: true,
    message: "Upit je sacuvan. Madlenianum tim ce vas kontaktirati.",
    item: eventPlanningInquiryDto(populated),
    emailStatus: populated.emailDelivery?.status,
  });
});

const createInquiryAdmin = ({ Model, populate, dto, type, spaceField }) => {
  const list = asyncHandler(async (req, res) => {
    const filter = await buildInquiryFilter(req.query, { spaceField });
    const { items, total, page, limit } = await pagedQuery({
      Model,
      filter,
      query: req.query,
      populate,
      sort: inquirySortFor(req.query.sort),
    });
    sendList(res, { items: items.map((item) => dto(item, { admin: true })), total, page, limit });
  });

  const get = asyncHandler(async (req, res) => {
    const item = await populate(Model.findById(req.params.id));
    if (!item) throw createHttpError(404, "Upit nije pronadjen.");
    res.json({ success: true, item: dto(item, { admin: true }) });
  });

  const updateStatus = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw createHttpError(404, "Upit nije pronadjen.");
    const toStatus = String(req.body.status || "").trim();
    validateInquiryTransition(item.status, toStatus);
    const fromStatus = item.status;
    item.status = toStatus;
    item.statusHistory.push({
      fromStatus,
      toStatus,
      reason: req.body.reason || "",
      changedBy: req.admin?._id,
      source: "admin",
    });
    await item.save();
    const populated = await populate(Model.findById(item._id));
    res.json({ success: true, item: dto(populated, { admin: true }) });
  });

  const updateNotes = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw createHttpError(404, "Upit nije pronadjen.");
    item.internalNotes = String(req.body.internalNotes || "");
    await item.save();
    const populated = await populate(Model.findById(item._id));
    res.json({ success: true, item: dto(populated, { admin: true }) });
  });

  const resend = asyncHandler(async (req, res) => {
    const item = await populate(Model.findById(req.params.id));
    if (!item) throw createHttpError(404, "Upit nije pronadjen.");
    const cooldownSeconds = Math.max(10, Number(process.env.INQUIRY_RESEND_COOLDOWN_SECONDS || 60));
    if (
      item.emailDelivery?.lastResendAt
      && Date.now() - new Date(item.emailDelivery.lastResendAt).getTime() < cooldownSeconds * 1000
    ) {
      throw createHttpError(429, `Sacekajte ${cooldownSeconds} sekundi pre ponovnog slanja.`);
    }
    const result = await sendInquiryNotification(item, type, { isResend: true });
    res.json({
      success: true,
      sent: result.sent,
      emailStatus: item.emailDelivery?.status,
      message: result.sent ? "Obavestenje je ponovo poslato." : "Upit je sacuvan, ali email nije poslat.",
    });
  });

  return { get, list, resend, updateNotes, updateStatus };
};

const rentalInquiryAdmin = createInquiryAdmin({
  Model: RentalInquiry,
  populate: populateRentalInquiry,
  dto: rentalInquiryDto,
  type: "rental",
  spaceField: "rentalSpace",
});

const eventPlanningInquiryAdmin = createInquiryAdmin({
  Model: EventPlanningInquiry,
  populate: populateEventPlanningInquiry,
  dto: eventPlanningInquiryDto,
  type: "eventPlanning",
  spaceField: "preferredRentalSpace",
});

module.exports = {
  archiveRentalSpace,
  createEventPlanningInquiry,
  createRentalInquiry,
  createRentalSpace,
  deleteRentalSpace,
  getEventPlanningInquiryById: eventPlanningInquiryAdmin.get,
  getPublicRentalSpace,
  getRentalInquiryById: rentalInquiryAdmin.get,
  getRentalSpaceById,
  listEventPlanningInquiries: eventPlanningInquiryAdmin.list,
  listPublicRentalSpaces,
  listRentalInquiries: rentalInquiryAdmin.list,
  listRentalSpaces,
  previewRentalSpace,
  publishRentalSpace,
  resendEventPlanningInquiry: eventPlanningInquiryAdmin.resend,
  resendRentalInquiry: rentalInquiryAdmin.resend,
  updateEventPlanningInquiryNotes: eventPlanningInquiryAdmin.updateNotes,
  updateEventPlanningInquiryStatus: eventPlanningInquiryAdmin.updateStatus,
  updateRentalInquiryNotes: rentalInquiryAdmin.updateNotes,
  updateRentalInquiryStatus: rentalInquiryAdmin.updateStatus,
  updateRentalSpace,
};
