const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const Event = require("../models/Event");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Production = require("../models/Production");
const Seat = require("../models/Seat");
const {
  calculateEffectiveSeatStates,
} = require("../services/effectiveSeatState.service");
const {
  assignNewPublicAccessToken,
} = require("../services/orderAccess.service");
const { adminOrderDto } = require("../services/orderDto.service");
const { sendOrderConfirmation } = require("../services/orderEmail.service");
const {
  expireOrderIfNeeded,
  processExpiredOrders,
  transitionOrder,
} = require("../services/orderLifecycle.service");

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toPositiveInteger = (value, fallback, maximum = 100) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
};
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const populateOrder = (query, { history = false, secrets = false } = {}) => {
  if (secrets) query.select("+publicAccessTokenHash +sessionId +idempotencyKey");
  query
    .populate({
      path: "event",
      populate: [{ path: "production" }, { path: "venue" }],
    })
    .populate({
      path: "items",
      populate: [{ path: "seat" }, { path: "priceCategory" }],
    });
  if (history) query.populate("statusHistory.changedBy", "username email");
  return query;
};

const eventIdsForFilters = async (query) => {
  const eventFilter = {};
  if (query.event) {
    if (!isObjectId(query.event)) return [];
    eventFilter._id = query.event;
  }
  if (query.dateFrom || query.dateTo) {
    eventFilter.startsAt = {};
    if (query.dateFrom) eventFilter.startsAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      eventFilter.startsAt.$lte = dateTo;
    }
  }
  if (query.time === "upcoming") eventFilter.startsAt = { $gte: new Date() };
  if (query.time === "past") eventFilter.startsAt = { $lt: new Date() };
  if (query.production) {
    if (!isObjectId(query.production)) return [];
    eventFilter.production = query.production;
  }
  if (query.eventSearch) {
    const productionIds = await Production.find({
      title: new RegExp(escapeRegex(query.eventSearch), "i"),
    }).distinct("_id");
    eventFilter.production = { $in: productionIds };
  }
  if (!Object.keys(eventFilter).length) return null;
  return Event.find(eventFilter).distinct("_id");
};

const buildOrderFilter = async (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.orderType) filter.orderType = query.orderType;
  if (query.emailStatus) filter["emailDelivery.status"] = query.emailStatus;

  if (query.tab === "reservations") {
    filter.orderType = "reservation";
    filter.status = "reserved";
  } else if (query.tab === "pending-payment") {
    filter.status = "pending_payment";
  } else if (query.tab === "paid") {
    filter.status = "paid";
  } else if (query.tab === "cancelled") {
    filter.status = "cancelled";
  } else if (query.tab === "expired") {
    filter.status = "expired";
  }

  const eventIds = await eventIdsForFilters(query);
  if (eventIds !== null) filter.event = { $in: eventIds };

  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), "i");
    const productionIds = await Production.find({ title: regex }).distinct("_id");
    const matchingEventIds = productionIds.length
      ? await Event.find({ production: { $in: productionIds } }).distinct("_id")
      : [];
    filter.$or = [
      { orderCode: regex },
      { "customerSnapshot.firstName": regex },
      { "customerSnapshot.lastName": regex },
      { "customerSnapshot.fullName": regex },
      { "customerSnapshot.email": regex },
      { "customerSnapshot.phone": regex },
      ...(matchingEventIds.length ? [{ event: { $in: matchingEventIds } }] : []),
    ];
  }
  return filter;
};

const getOrderOverview = asyncHandler(async (req, res) => {
  await processExpiredOrders();
  const page = toPositiveInteger(req.query.page, 1, 100000);
  const limit = toPositiveInteger(req.query.limit, 12, 50);
  const eventFilter = {};
  if (req.query.venue && isObjectId(req.query.venue)) eventFilter.venue = req.query.venue;
  if (req.query.time === "past") eventFilter.startsAt = { $lt: new Date() };
  else if (req.query.time !== "all") eventFilter.startsAt = { $gte: new Date() };
  if (req.query.q) {
    const productionIds = await Production.find({
      title: new RegExp(escapeRegex(req.query.q), "i"),
    }).distinct("_id");
    eventFilter.production = { $in: productionIds };
  }
  const [events, total] = await Promise.all([
    Event.find(eventFilter)
      .populate("production", "title type")
      .populate("venue", "name")
      .populate("seatMap", "name")
      .populate({ path: "pricePlan", populate: [{ path: "rules.priceCategory" }] })
      .sort("startsAt")
      .skip((page - 1) * limit)
      .limit(limit),
    Event.countDocuments(eventFilter),
  ]);
  const soonThreshold = new Date(Date.now() + 60 * 60 * 1000);
  const items = [];
  for (const event of events) {
    const [seats, orders] = await Promise.all([
      event.seatMap
        ? Seat.find({ seatMap: event.seatMap._id, isActive: true }).populate("priceCategory")
        : [],
      Order.find({ event: event._id }).select(
        "status orderType paymentStatus totalAmount currency items reservationExpiresAt paymentExpiresAt expiresAt emailDelivery"
      ),
    ]);
    const effective = event.seatMap
      ? await calculateEffectiveSeatStates(event, { seats })
      : { counts: {} };
    const countSeats = (statuses) => orders
      .filter((order) => statuses.includes(order.status))
      .reduce((sum, order) => sum + Number(order.items?.length || 0), 0);
    const reservedSeats = countSeats(["reserved"]);
    const pendingPaymentSeats = countSeats(["pending_payment"]);
    const paidSeats = countSeats(["paid"]);
    const occupied = reservedSeats + pendingPaymentSeats + paidSeats;
    const paidOrders = orders.filter((order) => order.status === "paid");
    items.push({
      event: {
        id: String(event._id),
        productionTitle: event.production?.title || "",
        startsAt: event.startsAt,
        venueName: event.venue?.name || "",
        status: event.status,
        saleStatus: event.saleStatus,
      },
      stats: {
        totalSeats: seats.length,
        availableSeats: Number(effective.counts.available || 0),
        reservedSeats,
        reservedOrders: orders.filter((order) => order.status === "reserved").length,
        pendingPaymentSeats,
        pendingPaymentOrders: orders.filter((order) => order.status === "pending_payment").length,
        paidSeats,
        paidOrders: paidOrders.length,
        cancelledOrders: orders.filter((order) => order.status === "cancelled").length,
        expiredOrders: orders.filter((order) => order.status === "expired").length,
        occupancyPercentage: seats.length
          ? Math.round((occupied / seats.length) * 1000) / 10
          : 0,
        paidRevenue: paidOrders.reduce(
          (sum, order) => sum + Number(order.totalAmount || 0),
          0
        ),
        currency: event.pricePlan?.currency || paidOrders[0]?.currency || "RSD",
        failedEmails: orders.filter((order) => order.emailDelivery?.status === "failed").length,
        expiringSoon: orders.filter((order) => {
          if (!["reserved", "pending_payment"].includes(order.status)) return false;
          const expiry = order.reservationExpiresAt || order.paymentExpiresAt || order.expiresAt;
          return expiry && expiry > new Date() && expiry <= soonThreshold;
        }).length,
      },
    });
  }
  res.json({
    success: true,
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const getOrders = asyncHandler(async (req, res) => {
  await processExpiredOrders();
  const page = toPositiveInteger(req.query.page, 1, 100000);
  const limit = toPositiveInteger(req.query.limit, 25, 100);
  const filter = await buildOrderFilter(req.query);
  const [orders, total] = await Promise.all([
    populateOrder(
      Order.find(filter)
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(limit)
    ),
    Order.countDocuments(filter),
  ]);
  res.json({
    success: true,
    items: orders.map((order) => adminOrderDto(order)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) {
    const error = new Error("Neispravan ID porudzbine.");
    error.statusCode = 400;
    throw error;
  }
  const order = await populateOrder(Order.findById(req.params.id), { history: true });
  if (!order) {
    const error = new Error("Porudzbina nije pronadjena.");
    error.statusCode = 404;
    throw error;
  }
  if (await expireOrderIfNeeded(order)) {
    await order.populate("items");
  }
  res.json({ success: true, item: adminOrderDto(order, { includeHistory: true }) });
});

const loadOrderForAction = async (id) => {
  if (!isObjectId(id)) {
    const error = new Error("Neispravan ID porudzbine.");
    error.statusCode = 400;
    throw error;
  }
  const order = await Order.findById(id)
    .select("+publicAccessTokenHash +sessionId +idempotencyKey");
  if (!order) {
    const error = new Error("Porudzbina nije pronadjena.");
    error.statusCode = 404;
    throw error;
  }
  await expireOrderIfNeeded(order);
  return order;
};

const performStatusUpdate = async (req, res, forcedStatus) => {
  const order = await loadOrderForAction(req.params.id);
  const toStatus = String(forcedStatus || req.body.status || "").trim();
  if (!toStatus) {
    const error = new Error("Novi status je obavezan.");
    error.statusCode = 400;
    throw error;
  }
  if (toStatus === "paid" && req.admin?.role !== "administrator") {
    const error = new Error("Samo administrator moze rucno oznaciti porudzbinu kao placenu.");
    error.statusCode = 403;
    throw error;
  }
  await transitionOrder(order, toStatus, {
    adminId: req.admin?._id,
    reason: req.body.reason,
    source: "admin",
  });
  const accessToken = assignNewPublicAccessToken(order);
  await order.save();
  const populated = await populateOrder(Order.findById(order._id), { history: true });
  await sendOrderConfirmation(populated, accessToken);
  res.json({ success: true, item: adminOrderDto(populated, { includeHistory: true }) });
};

const updateOrderStatus = asyncHandler((req, res) => performStatusUpdate(req, res));

const cancelOrder = asyncHandler((req, res) => performStatusUpdate(req, res, "cancelled"));

const markOrderPaid = asyncHandler((req, res) => performStatusUpdate(req, res, "paid"));

const resendOrderConfirmation = asyncHandler(async (req, res) => {
  const order = await loadOrderForAction(req.params.id);
  const cooldownSeconds = Math.max(
    10,
    Number(process.env.ORDER_RESEND_COOLDOWN_SECONDS || 60)
  );
  const lastResendAt = order.emailDelivery?.lastResendAt;
  if (
    lastResendAt
    && Date.now() - new Date(lastResendAt).getTime() < cooldownSeconds * 1000
  ) {
    const error = new Error(
      `Sacekajte ${cooldownSeconds} sekundi pre ponovnog slanja.`
    );
    error.statusCode = 429;
    throw error;
  }
  const accessToken = assignNewPublicAccessToken(order);
  await order.save();
  const populated = await populateOrder(Order.findById(order._id));
  const result = await sendOrderConfirmation(populated, accessToken, { isResend: true });
  res.json({
    success: true,
    sent: result.sent,
    emailStatus: populated.emailDelivery?.status,
    message: result.sent
      ? "Potvrda je ponovo poslata."
      : "Porudzbina je sacuvana, ali email nije poslat.",
  });
});

const createSecurePublicLink = asyncHandler(async (req, res) => {
  const order = await loadOrderForAction(req.params.id);
  const accessToken = assignNewPublicAccessToken(order);
  await order.save();
  const baseUrl = String(
    process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || "http://localhost:4200"
  ).replace(/\/+$/, "");
  res.json({
    success: true,
    url: `${baseUrl}/porudzbina/${encodeURIComponent(order.orderCode)}?token=${encodeURIComponent(accessToken)}`,
  });
});

module.exports = {
  cancelOrder,
  createSecurePublicLink,
  getOrderById,
  getOrderOverview,
  getOrders,
  markOrderPaid,
  resendOrderConfirmation,
  updateOrderStatus,
};
