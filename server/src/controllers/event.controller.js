const asyncHandler = require("../utils/asyncHandler");

const Event = require("../models/Event");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Seat = require("../models/Seat");
const SeatLock = require("../models/SeatLock");
const {
  conflictError,
  eventDangerousChanges,
  getEventUsage,
  normalizeEventPayload,
  validateEventConfiguration,
  validationError,
} = require("../services/ticketingConfiguration.service");
const { normalizeEventStatus, normalizeSaleStatus } = require("../constants/ticketing.constants");
const {
  calculateEffectiveSeatStates,
} = require("../services/effectiveSeatState.service");

const populateEvent = [
  { path: "production", populate: [{ path: "poster" }] },
  { path: "venue" },
  { path: "seatMap" },
  {
    path: "pricePlan",
    populate: [{ path: "rules.priceCategory" }, { path: "parentPlan" }],
  },
];

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const canonicalEvent = (event, warnings = []) => {
  const item = event?.toObject ? event.toObject() : { ...event };
  item.status = normalizeEventStatus(item.status);
  item.saleStatus = normalizeSaleStatus(item.saleStatus);
  item.configurationWarnings = warnings;
  return item;
};

const buildEventFilter = async (query) => {
  const filter = {};
  if (query.production) filter.production = query.production;
  if (query.venue) filter.venue = query.venue;
  if (query.status) filter.status = query.status;
  if (query.saleStatus) filter.saleStatus = query.saleStatus;
  if (query.ticketingProvider) filter["ticketing.provider"] = query.ticketingProvider;
  if (query.isPremiere !== undefined && query.isPremiere !== "") {
    filter.isPremiere = query.isPremiere === "true";
  }

  const from = parseDate(query.from);
  const to = parseDate(query.to);
  const timeScope = query.timeScope || (!from && !to ? "future" : "all");
  if (from || to || ["future", "past"].includes(timeScope)) {
    filter.startsAt = {};
    if (from) filter.startsAt.$gte = from;
    if (to) filter.startsAt.$lte = to;
    if (!from && timeScope === "future") filter.startsAt.$gte = new Date();
    if (!to && timeScope === "past") filter.startsAt.$lt = new Date();
  }

  if (query.q) {
    const escaped = String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const Production = require("../models/Production");
    const productionIds = await Production.find({ title: new RegExp(escaped, "i") }).distinct("_id");
    filter.production = filter.production
      ? { $in: productionIds.filter((id) => String(id) === String(query.production)) }
      : { $in: productionIds };
  }
  return filter;
};

const allowedSort = new Set(["startsAt", "-startsAt", "createdAt", "-createdAt", "updatedAt", "-updatedAt"]);

const getEvents = asyncHandler(async (req, res) => {
  const filter = await buildEventFilter(req.query);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const sort = allowedSort.has(req.query.sort) ? req.query.sort : "startsAt";

  const [events, total] = await Promise.all([
    Event.find(filter).populate(populateEvent).sort(sort).skip((page - 1) * limit).limit(limit),
    Event.countDocuments(filter),
  ]);

  const items = await Promise.all(events.map(async (event) => {
    const result = await validateEventConfiguration({}, { existingEvent: event });
    return canonicalEvent(event, [...result.errors, ...result.warnings]);
  }));

  res.json({
    success: true,
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate(populateEvent);
  if (!event) {
    const error = new Error("Termin nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  const [usage, validation] = await Promise.all([
    getEventUsage(event._id),
    validateEventConfiguration({}, { existingEvent: event }),
  ]);
  res.json({
    success: true,
    item: canonicalEvent(event, [...validation.errors, ...validation.warnings]),
    meta: { usage },
  });
});

const validateRequest = async (payload, existingEvent = null) => {
  const result = await validateEventConfiguration(payload, { existingEvent });
  if (result.errors.length) {
    throw validationError("Konfiguracija termina nije ispravna.", result.errors, result.warnings);
  }
  return result;
};

const createEvent = asyncHandler(async (req, res) => {
  const validation = await validateRequest(req.body);
  const event = await Event.create(normalizeEventPayload(req.body));
  const populated = await Event.findById(event._id).populate(populateEvent);
  res.status(201).json({ success: true, item: canonicalEvent(populated, validation.warnings), warnings: validation.warnings });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    const error = new Error("Termin nije pronađen.");
    error.statusCode = 404;
    throw error;
  }

  const usage = await getEventUsage(event._id);
  const dangerousFields = eventDangerousChanges(event, req.body);
  if (usage.hasHistory && dangerousFields.length) {
    throw conflictError("Termin ima ticketing istoriju i kritična konfiguracija ne može biti promenjena.", {
      fields: dangerousFields,
      usage,
      recommendation: "Zatvorite prodaju, otkažite ili odložite termin. Za novu konfiguraciju duplirajte termin.",
    });
  }

  const validation = await validateRequest(req.body, event);
  Object.assign(event, normalizeEventPayload(req.body, event));
  await event.save();
  const populated = await Event.findById(event._id).populate(populateEvent);
  res.json({ success: true, item: canonicalEvent(populated, validation.warnings), warnings: validation.warnings });
});

const validateEvent = asyncHandler(async (req, res) => {
  const existingEvent = req.params.id ? await Event.findById(req.params.id) : null;
  if (req.params.id && !existingEvent) {
    const error = new Error("Termin nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  const result = await validateEventConfiguration(req.body, { existingEvent });
  res.json({ success: true, valid: result.errors.length === 0, errors: result.errors, warnings: result.warnings });
});

const duplicateEvent = asyncHandler(async (req, res) => {
  const source = await Event.findById(req.params.id);
  if (!source) {
    const error = new Error("Termin nije pronađen.");
    error.statusCode = 404;
    throw error;
  }

  const body = req.body || {};
  const startsAt = body.startsAt ? new Date(body.startsAt) : source.startsAt;
  const sourceDuration = source.endsAt ? new Date(source.endsAt).getTime() - new Date(source.startsAt).getTime() : 0;
  const endsAt = body.endsAt
    ? new Date(body.endsAt)
    : (sourceDuration > 0 ? new Date(new Date(startsAt).getTime() + sourceDuration) : null);

  const duplicate = await Event.create({
    production: source.production,
    venue: source.venue,
    startsAt,
    endsAt,
    isPremiere: source.isPremiere,
    badge: source.badge,
    status: "draft",
    saleStatus: "not_started",
    seatMap: source.seatMap,
    pricePlan: source.pricePlan,
    saleStartsAt: null,
    saleEndsAt: null,
    maxTicketsPerOrder: source.maxTicketsPerOrder,
    lockDurationMinutes: source.lockDurationMinutes,
    ticketing: {
      enabled: false,
      provider: source.ticketing?.provider || "manual",
      legacyEventId: "",
      externalCheckoutUrl: source.ticketing?.provider === "external"
        ? source.ticketing?.externalCheckoutUrl || ""
        : "",
      note: source.ticketing?.note || "",
    },
    basePrice: source.basePrice,
    notes: source.notes ? `${source.notes}\nDuplikat termina ${source._id}.` : `Duplikat termina ${source._id}.`,
  });

  const populated = await Event.findById(duplicate._id).populate(populateEvent);
  res.status(201).json({
    success: true,
    item: canonicalEvent(populated),
    meta: { sourceEventId: String(source._id), requiresDateReview: true },
  });
});

const applyEventAction = (action) => asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    const error = new Error("Termin nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  if (action === "close-sale") event.saleStatus = "closed";
  if (action === "cancel") {
    event.status = "cancelled";
    event.saleStatus = "closed";
    event.ticketing.enabled = false;
  }
  if (action === "archive") {
    event.status = "archived";
    event.saleStatus = "closed";
    event.ticketing.enabled = false;
  }
  await event.save();
  const populated = await Event.findById(event._id).populate(populateEvent);
  res.json({ success: true, item: canonicalEvent(populated) });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    const error = new Error("Termin nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  const usage = await getEventUsage(event._id);
  if (usage.hasHistory) {
    throw conflictError("Termin ne može biti obrisan jer ima ticketing istoriju.", {
      usage,
      recommendation: "Arhivirajte, otkažite ili zatvorite prodaju umesto brisanja.",
    });
  }
  await event.deleteOne();
  res.json({ success: true, message: "Termin je obrisan." });
});

const getEventTicketingSummary = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate(populateEvent);
  if (!event) {
    const error = new Error("Termin nije pronađen.");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const [seats, orders, orderItems, activeLocks, validation] = await Promise.all([
    event.seatMap ? Seat.find({ seatMap: event.seatMap._id, isActive: true }).populate("priceCategory") : [],
    Order.find({ event: event._id }).select("_id status paymentStatus totalAmount expiresAt"),
    OrderItem.find({ event: event._id }).select("seat order status finalPrice"),
    SeatLock.find({ event: event._id, status: "active", expiresAt: { $gt: now } }).select("seat"),
    validateEventConfiguration({}, { existingEvent: event }),
  ]);

  const orderById = new Map(orders.map((order) => [String(order._id), order]));
  const activeReservedOrder = (order) => order?.status === "reserved"
    && (!order.expiresAt || new Date(order.expiresAt) > now);
  const reservedSeatIds = new Set();
  const paidSeatIds = new Set();
  let cancelledOrExpiredItemsCount = 0;
  orderItems.forEach((item) => {
    const order = orderById.get(String(item.order));
    if (item.status === "paid" || order?.status === "paid" || order?.paymentStatus === "paid") {
      paidSeatIds.add(String(item.seat));
    } else if (item.status === "reserved" && activeReservedOrder(order)) {
      reservedSeatIds.add(String(item.seat));
    } else if (["cancelled", "refunded"].includes(item.status) || ["cancelled", "expired", "refunded"].includes(order?.status)) {
      cancelledOrExpiredItemsCount += 1;
    }
  });

  const sellableSeatIds = new Set(seats
    .filter((seat) => seat.isSellable && seat.seatType !== "unavailable")
    .map((seat) => String(seat._id)));
  const paidOrders = orders.filter((order) => order.status === "paid" || order.paymentStatus === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const occupancy = sellableSeatIds.size
    ? Math.round(((reservedSeatIds.size + paidSeatIds.size) / sellableSeatIds.size) * 1000) / 10
    : 0;
  const effective = event.seatMap
    ? await calculateEffectiveSeatStates(event, { seats })
    : { counts: {} };
  const effectiveAvailable = Number(effective.counts.available || 0);
  const effectiveUnavailable = Number(effective.counts.unavailable || 0)
    + Number(effective.counts.box_office_only || 0);

  res.json({
    success: true,
    item: {
      event: canonicalEvent(event),
      warnings: [...validation.errors, ...validation.warnings],
      stats: {
        totalConfiguredSeats: seats.length,
        sellableSeats: sellableSeatIds.size,
        unavailableSeats: effectiveUnavailable,
        availableSeats: effectiveAvailable,
        activeLocksCount: activeLocks.length,
        reservedSeatsCount: reservedSeatIds.size,
        paidSeatsCount: paidSeatIds.size,
        cancelledOrExpiredItemsCount,
        occupancyPercentage: occupancy,
        reservedOrdersCount: orders.filter(activeReservedOrder).length,
        paidOrdersCount: paidOrders.length,
        cancelledOrdersCount: orders.filter((order) => ["cancelled", "expired", "refunded"].includes(order.status)).length,
        paidRevenue: revenue,
        currency: event.pricePlan?.currency || "RSD",
      },
    },
  });
});

module.exports = {
  archiveEvent: applyEventAction("archive"),
  cancelEvent: applyEventAction("cancel"),
  closeEventSale: applyEventAction("close-sale"),
  createEvent,
  deleteEvent,
  duplicateEvent,
  getEventById,
  getEventTicketingSummary,
  getEvents,
  updateEvent,
  validateEvent,
};
