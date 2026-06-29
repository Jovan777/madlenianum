const asyncHandler = require("../utils/asyncHandler");

const Event = require("../models/Event");
const Production = require("../models/Production");
const Venue = require("../models/Venue");
const SeatMap = require("../models/SeatMap");
const PricePlan = require("../models/PricePlan");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const SeatLock = require("../models/SeatLock");

const EVENT_STATUSES = ["draft", "scheduled", "cancelled", "postponed", "finished"];

const SALE_STATUSES = [
  "not_on_sale",
  "on_sale",
  "sold_out",
  "sales_closed",
  "free",
];

const TICKETING_PROVIDERS = ["internal", "legacy_php", "external", "manual"];

const populateEvent = [
  {
    path: "production",
    populate: [{ path: "poster" }],
  },
  { path: "venue" },
  { path: "seatMap" },
  {
    path: "pricePlan",
    populate: [{ path: "rules.priceCategory" }],
  },
];

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return value === true || value === "true";
};

const parseDate = (value) => {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const buildEventFilter = (query) => {
  const filter = {};

  if (query.production) {
    filter.production = query.production;
  }

  if (query.venue) {
    filter.venue = query.venue;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.saleStatus) {
    filter.saleStatus = query.saleStatus;
  }

  if (query.ticketingProvider) {
    filter["ticketing.provider"] = query.ticketingProvider;
  }

  const isPremiere = parseBoolean(query.isPremiere);

  if (isPremiere !== undefined) {
    filter.isPremiere = isPremiere;
  }

  const fromDate = parseDate(query.from);
  const toDate = parseDate(query.to);

  if (fromDate || toDate) {
    filter.startsAt = {};

    if (fromDate) {
      filter.startsAt.$gte = fromDate;
    }

    if (toDate) {
      filter.startsAt.$lte = toDate;
    }
  }

  return filter;
};

const validateEventPayload = async (payload, existingEvent = null) => {
  const errors = [];

  const productionId = payload.production ?? existingEvent?.production;
  const venueId = payload.venue ?? existingEvent?.venue;
  const seatMapId = payload.seatMap ?? existingEvent?.seatMap;
  const pricePlanId = payload.pricePlan ?? existingEvent?.pricePlan;

  if (!productionId) {
    errors.push("Production is required.");
  }

  if (!venueId) {
    errors.push("Venue is required.");
  }

  if (!payload.startsAt && !existingEvent?.startsAt) {
    errors.push("Start date and time are required.");
  }

  if (payload.status && !EVENT_STATUSES.includes(payload.status)) {
    errors.push("Invalid event status.");
  }

  if (payload.saleStatus && !SALE_STATUSES.includes(payload.saleStatus)) {
    errors.push("Invalid sale status.");
  }

  if (payload.ticketing?.provider && !TICKETING_PROVIDERS.includes(payload.ticketing.provider)) {
    errors.push("Invalid ticketing provider.");
  }

  const startsAt = parseDate(payload.startsAt);

  if (payload.startsAt && startsAt === null) {
    errors.push("Invalid startsAt date.");
  }

  const endsAt = parseDate(payload.endsAt);

  if (payload.endsAt && endsAt === null) {
    errors.push("Invalid endsAt date.");
  }

  if (startsAt && endsAt && endsAt <= startsAt) {
    errors.push("endsAt must be after startsAt.");
  }

  const saleStartsAt = parseDate(payload.saleStartsAt);

  if (payload.saleStartsAt && saleStartsAt === null) {
    errors.push("Invalid saleStartsAt date.");
  }

  const saleEndsAt = parseDate(payload.saleEndsAt);

  if (payload.saleEndsAt && saleEndsAt === null) {
    errors.push("Invalid saleEndsAt date.");
  }

  if (saleStartsAt && saleEndsAt && saleEndsAt <= saleStartsAt) {
    errors.push("saleEndsAt must be after saleStartsAt.");
  }

  if (payload.maxTicketsPerOrder !== undefined) {
    const value = Number(payload.maxTicketsPerOrder);

    if (!Number.isInteger(value) || value < 1 || value > 20) {
      errors.push("maxTicketsPerOrder must be between 1 and 20.");
    }
  }

  if (payload.lockDurationMinutes !== undefined) {
    const value = Number(payload.lockDurationMinutes);

    if (!Number.isInteger(value) || value < 1 || value > 60) {
      errors.push("lockDurationMinutes must be between 1 and 60.");
    }
  }

  if (productionId) {
    const productionExists = await Production.exists({ _id: productionId });

    if (!productionExists) {
      errors.push("Selected production does not exist.");
    }
  }

  if (venueId) {
    const venueExists = await Venue.exists({ _id: venueId });

    if (!venueExists) {
      errors.push("Selected venue does not exist.");
    }
  }

  if (seatMapId) {
    const seatMap = await SeatMap.findById(seatMapId);

    if (!seatMap) {
      errors.push("Selected seat map does not exist.");
    } else if (venueId && String(seatMap.venue) !== String(venueId)) {
      errors.push("Selected seat map does not belong to the selected venue.");
    }
  }

  if (pricePlanId) {
    const pricePlan = await PricePlan.findById(pricePlanId);

    if (!pricePlan) {
      errors.push("Selected price plan does not exist.");
    } else if (venueId && pricePlan.venue && String(pricePlan.venue) !== String(venueId)) {
      errors.push("Selected price plan does not belong to the selected venue.");
    }
  }

  if (payload.ticketing?.enabled) {
    const provider = payload.ticketing.provider || existingEvent?.ticketing?.provider || "manual";

    if (provider === "internal") {
      if (!seatMapId) {
        errors.push("Internal ticketing requires a seat map.");
      }

      if (!pricePlanId) {
        errors.push("Internal ticketing requires a price plan.");
      }
    }

    if (provider === "legacy_php" || provider === "external") {
      const externalCheckoutUrl =
        payload.ticketing.externalCheckoutUrl ??
        existingEvent?.ticketing?.externalCheckoutUrl;

      if (!externalCheckoutUrl) {
        errors.push("External or legacy PHP ticketing requires externalCheckoutUrl.");
      }
    }
  }

  return errors;
};

const normalizeEventPayload = (payload) => {
  const normalized = {};

  const directFields = [
    "production",
    "venue",
    "startsAt",
    "endsAt",
    "isPremiere",
    "badge",
    "status",
    "saleStatus",
    "seatMap",
    "pricePlan",
    "saleStartsAt",
    "saleEndsAt",
    "maxTicketsPerOrder",
    "lockDurationMinutes",
    "basePrice",
    "notes",
  ];

  directFields.forEach((field) => {
    if (payload[field] !== undefined) {
      normalized[field] = payload[field];
    }
  });

  if (payload.startsAt) {
    normalized.startsAt = new Date(payload.startsAt);
  }

  if (payload.endsAt) {
    normalized.endsAt = new Date(payload.endsAt);
  }

  if (payload.saleStartsAt) {
    normalized.saleStartsAt = new Date(payload.saleStartsAt);
  }

  if (payload.saleEndsAt) {
    normalized.saleEndsAt = new Date(payload.saleEndsAt);
  }

  if (payload.maxTicketsPerOrder !== undefined) {
    normalized.maxTicketsPerOrder = Number(payload.maxTicketsPerOrder);
  }

  if (payload.lockDurationMinutes !== undefined) {
    normalized.lockDurationMinutes = Number(payload.lockDurationMinutes);
  }

  if (payload.ticketing !== undefined) {
    normalized.ticketing = {
      enabled: Boolean(payload.ticketing.enabled),
      provider: payload.ticketing.provider || "manual",
      legacyEventId: payload.ticketing.legacyEventId || "",
      externalCheckoutUrl: payload.ticketing.externalCheckoutUrl || "",
      note: payload.ticketing.note || "",
    };
  }

  return normalized;
};

const getEvents = asyncHandler(async (req, res) => {
  const filter = buildEventFilter(req.query);

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const skip = (page - 1) * limit;

  let sort = "startsAt";

  if (req.query.sort) {
    sort = req.query.sort;
  }

  const [items, total] = await Promise.all([
    Event.find(filter)
      .populate(populateEvent)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Event.countDocuments(filter),
  ]);

  res.json({
    success: true,
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

const getEventById = asyncHandler(async (req, res) => {
  const item = await Event.findById(req.params.id).populate(populateEvent);

  if (!item) {
    res.status(404);
    throw new Error("Event not found.");
  }

  const [ordersCount, activeLocksCount] = await Promise.all([
    Order.countDocuments({
      event: item._id,
      status: { $in: ["reserved", "paid"] },
    }),
    SeatLock.countDocuments({
      event: item._id,
      status: "active",
      expiresAt: { $gt: new Date() },
    }),
  ]);

  res.json({
    success: true,
    item,
    meta: {
      ordersCount,
      activeLocksCount,
    },
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const errors = await validateEventPayload(req.body);

  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join(" "));
  }

  const payload = normalizeEventPayload(req.body);

  const item = await Event.create(payload);

  const populatedItem = await Event.findById(item._id).populate(populateEvent);

  res.status(201).json({
    success: true,
    item: populatedItem,
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  const item = await Event.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Event not found.");
  }

  const errors = await validateEventPayload(req.body, item);

  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join(" "));
  }

  const payload = normalizeEventPayload(req.body);

  Object.assign(item, payload);
  await item.save();

  const updatedItem = await Event.findById(item._id).populate(populateEvent);

  res.json({
    success: true,
    item: updatedItem,
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const item = await Event.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Event not found.");
  }

  const [ordersCount, orderItemsCount, activeLocksCount] = await Promise.all([
    Order.countDocuments({ event: item._id }),
    OrderItem.countDocuments({ event: item._id }),
    SeatLock.countDocuments({ event: item._id, status: "active" }),
  ]);

  if (ordersCount > 0 || orderItemsCount > 0 || activeLocksCount > 0) {
    res.status(400);
    throw new Error(
      "Event cannot be deleted because it has orders, order items or active seat locks. Change status instead."
    );
  }

  await item.deleteOne();

  res.json({
    success: true,
    message: "Event deleted.",
  });
});

const getEventTicketingSummary = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate("production")
    .populate("venue")
    .populate("seatMap")
    .populate({
      path: "pricePlan",
      populate: [{ path: "rules.priceCategory" }],
    });

  if (!event) {
    res.status(404);
    throw new Error("Event not found.");
  }

  const now = new Date();

  const [
    reservedOrdersCount,
    paidOrdersCount,
    reservedItemsCount,
    paidItemsCount,
    activeLocksCount,
  ] = await Promise.all([
    Order.countDocuments({
      event: event._id,
      status: "reserved",
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    }),
    Order.countDocuments({
      event: event._id,
      status: "paid",
    }),
    OrderItem.countDocuments({
      event: event._id,
      status: "reserved",
    }),
    OrderItem.countDocuments({
      event: event._id,
      status: "paid",
    }),
    SeatLock.countDocuments({
      event: event._id,
      status: "active",
      expiresAt: { $gt: now },
    }),
  ]);

  res.json({
    success: true,
    item: {
      event,
      ticketing: event.ticketing,
      saleStatus: event.saleStatus,
      seatMap: event.seatMap,
      pricePlan: event.pricePlan,
      maxTicketsPerOrder: event.maxTicketsPerOrder,
      lockDurationMinutes: event.lockDurationMinutes,
      stats: {
        reservedOrdersCount,
        paidOrdersCount,
        reservedItemsCount,
        paidItemsCount,
        activeLocksCount,
      },
    },
  });
});

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventTicketingSummary,
};
