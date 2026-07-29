const crypto = require("crypto");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");

const Event = require("../models/Event");
const Seat = require("../models/Seat");
const SeatLock = require("../models/SeatLock");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const {
  getPublicTicketingReadiness,
  validationError,
} = require("../services/ticketingConfiguration.service");
const {
  calculateEffectiveSeatStates,
  getSeatPrice,
  publicSeatDto,
} = require("../services/effectiveSeatState.service");
const {
  assignNewPublicAccessToken,
  tokenMatchesHash,
} = require("../services/orderAccess.service");
const { sendOrderConfirmation } = require("../services/orderEmail.service");
const { publicOrderDto } = require("../services/orderDto.service");
const {
  expireOrderIfNeeded,
  processExpiredOrders,
} = require("../services/orderLifecycle.service");
const { localizedValue, normalizeLocale } = require("../services/locale.service");

const conflict = (message, details) => {
  const error = new Error(message);
  error.statusCode = 409;
  error.details = details;
  return error;
};

const expireOldLocksAndOrders = async () => {
  const now = new Date();
  await SeatLock.updateMany(
    { status: "active", expiresAt: { $lte: now } },
    { $set: { status: "expired" } }
  );
  await processExpiredOrders();
};

const populateOrder = (query, { includeSecrets = false } = {}) => {
  if (includeSecrets) query.select("+sessionId +publicAccessTokenHash +idempotencyKey");
  return query
    .populate({
      path: "event",
      populate: [{ path: "production" }, { path: "venue" }],
    })
    .populate({
      path: "items",
      populate: [{ path: "seat" }, { path: "priceCategory" }],
    });
};

const getEventWithTicketing = async (eventId, { requireOnSale = false } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Neispravan ID termina.");
    error.statusCode = 400;
    throw error;
  }
  const event = await Event.findById(eventId)
    .populate({ path: "production", populate: [{ path: "poster" }] })
    .populate("venue")
    .populate("seatMap")
    .populate({ path: "pricePlan", populate: [{ path: "rules.priceCategory" }] });

  if (!event) {
    const error = new Error("Termin nije pronadjen.");
    error.statusCode = 404;
    throw error;
  }
  if (!event.seatMap) {
    const error = new Error("Termin nema mapu sedista.");
    error.statusCode = 400;
    throw error;
  }
  const readiness = await getPublicTicketingReadiness(event, { requireOnSale });
  if (!readiness.ready) {
    throw validationError(
      "Termin nije spreman za internu prodaju ulaznica.",
      readiness.errors,
      readiness.warnings
    );
  }
  return event;
};

const normalizeSeatIds = (seatIds) => {
  if (!Array.isArray(seatIds) || seatIds.length === 0) return [];
  const normalized = seatIds.map((id) => String(id || "").trim()).filter(Boolean);
  return [...new Set(normalized)];
};

const normalizeCustomerSnapshot = (snapshot = {}) => {
  const suppliedFullName = String(snapshot.fullName || "").trim();
  const nameParts = suppliedFullName.split(/\s+/).filter(Boolean);
  const firstName = String(snapshot.firstName || nameParts[0] || "").trim();
  const lastName = String(
    snapshot.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "")
  ).trim();
  return {
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    email: String(snapshot.email || "").trim().toLowerCase(),
    phone: String(snapshot.phone || "").trim(),
  };
};

const normalizeOrderAction = (value) => {
  const action = String(value || "reserve").trim().toLowerCase();
  return ["reserve", "purchase"].includes(action) ? action : "";
};

const isSameLockOwner = (lock, sessionId) => (
  Boolean(sessionId && lock.sessionId && lock.sessionId === sessionId)
);

const getPublicExpiry = (event, action) => {
  const envMinutes = action === "reserve"
    ? Number(process.env.RESERVATION_DURATION_MINUTES || 1440)
    : Number(process.env.PAYMENT_HOLD_MINUTES || event.lockDurationMinutes || 15);
  const sensibleMinutes = Number.isFinite(envMinutes) && envMinutes > 0
    ? Math.min(envMinutes, 10080)
    : 15;
  const proposed = new Date(Date.now() + sensibleMinutes * 60 * 1000);
  const eventStart = event.startsAt ? new Date(event.startsAt) : null;
  return eventStart && eventStart < proposed ? eventStart : proposed;
};

const getEventSeats = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();
  const event = await getEventWithTicketing(req.params.eventId);
  const seats = await Seat.find({ seatMap: event.seatMap._id, isActive: true })
    .populate("priceCategory")
    .sort("section sortOrder row number label");
  const effective = await calculateEffectiveSeatStates(event, { seats });
  res.json({
    success: true,
    event: {
      id: event._id,
      production: event.production ? {
        ...event.production.toObject(),
        title: localizedValue(event.production, "title", req.locale),
        slug: localizedValue(event.production, "slug", req.locale),
      } : null,
      venue: event.venue ? {
        ...event.venue.toObject(),
        name: localizedValue(event.venue, "name", req.locale),
        slug: localizedValue(event.venue, "slug", req.locale),
      } : null,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      saleStatus: event.saleStatus,
      ticketing: event.ticketing,
      seatMap: event.seatMap,
      pricePlan: event.pricePlan,
      maxTicketsPerOrder: event.maxTicketsPerOrder,
      lockDurationMinutes: event.lockDurationMinutes,
    },
    seats: effective.items.map(publicSeatDto),
  });
});

const lockSeats = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();
  const event = await getEventWithTicketing(req.params.eventId, { requireOnSale: true });
  const seatIds = normalizeSeatIds(req.body.seatIds);
  const sessionId = String(req.body.sessionId || "").trim();
  const checkoutKey = String(
    req.body.checkoutKey || crypto.randomUUID()
  ).trim();

  if (!event.ticketing?.enabled || event.saleStatus !== "on_sale") {
    throw conflict("Prodaja ulaznica trenutno nije aktivna.");
  }
  if (!seatIds.length) {
    const error = new Error("Izaberite najmanje jedno sediste.");
    error.statusCode = 400;
    throw error;
  }
  if (!sessionId) {
    const error = new Error("Nedostaje identifikator gostujuce sesije.");
    error.statusCode = 400;
    throw error;
  }
  if (seatIds.length > event.maxTicketsPerOrder) {
    const error = new Error(`Najvise ${event.maxTicketsPerOrder} ulaznica po porudzbini.`);
    error.statusCode = 400;
    throw error;
  }
  if (seatIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    const error = new Error("Jedno ili vise sedista ima neispravan ID.");
    error.statusCode = 400;
    throw error;
  }

  const seats = await Seat.find({
    _id: { $in: seatIds },
    seatMap: event.seatMap._id,
    isActive: true,
  }).populate("priceCategory");
  if (seats.length !== seatIds.length) {
    const error = new Error("Neka sedista ne pripadaju mapi ovog termina.");
    error.statusCode = 400;
    throw error;
  }

  const effective = await calculateEffectiveSeatStates(event, { seats });
  const unavailable = effective.items.find((item) =>
    ["unavailable", "box_office_only", "sold", "reserved"].includes(item.effectiveState)
  );
  if (unavailable) {
    throw conflict(`Sediste ${unavailable.seat.label} vise nije dostupno.`, {
      seatId: String(unavailable.seat._id),
      seatLabel: unavailable.seat.label,
      refreshSeats: true,
    });
  }

  const pricesBySeat = new Map();
  for (const seat of seats) {
    const price = getSeatPrice(seat, event.pricePlan);
    if (!price) {
      const error = new Error(`Sediste ${seat.label} nema vazecu cenu.`);
      error.statusCode = 400;
      throw error;
    }
    pricesBySeat.set(String(seat._id), price);
  }

  const now = new Date();
  const activeLocks = await SeatLock.find({
    event: event._id,
    seat: { $in: seatIds },
    status: "active",
    expiresAt: { $gt: now },
  }).select("+sessionId");
  const foreignLock = activeLocks.find((lock) => !isSameLockOwner(lock, sessionId));
  if (foreignLock) {
    const seat = seats.find((item) => String(item._id) === String(foreignLock.seat));
    throw conflict(`Sediste ${seat?.label || ""} je upravo zauzeto.`, {
      seatId: String(foreignLock.seat),
      seatLabel: seat?.label || "",
      refreshSeats: true,
    });
  }

  const existingSeatIds = new Set(activeLocks.map((lock) => String(lock.seat)));
  const newSeats = seats.filter((seat) => !existingSeatIds.has(String(seat._id)));
  const expiresAt = new Date(
    Date.now() + Number(event.lockDurationMinutes || 15) * 60 * 1000
  );

  try {
    if (newSeats.length) {
      await SeatLock.insertMany(newSeats.map((seat) => ({
        event: event._id,
        seat: seat._id,
        sessionId,
        checkoutKey,
        expiresAt,
        status: "active",
      })), { ordered: true });
    }
    await SeatLock.updateMany(
      {
        event: event._id,
        seat: { $in: seatIds },
        sessionId,
        status: "active",
      },
      { $set: { checkoutKey, expiresAt } }
    );
  } catch (error) {
    await SeatLock.deleteMany({
      event: event._id,
      sessionId,
      checkoutKey,
      seat: { $in: newSeats.map((seat) => seat._id) },
      status: "active",
    });
    if (error.code === 11000) {
      throw conflict("Jedno od izabranih sedista je u medjuvremenu zauzeto.", {
        refreshSeats: true,
      });
    }
    throw error;
  }

  const locks = await SeatLock.find({
    event: event._id,
    seat: { $in: seatIds },
    sessionId,
    checkoutKey,
    status: "active",
    expiresAt: { $gt: new Date() },
  });
  if (locks.length !== seatIds.length) {
    await SeatLock.updateMany(
      { event: event._id, sessionId, checkoutKey, status: "active" },
      { $set: { status: "released" } }
    );
    throw conflict("Sedista nisu mogla bezbedno da se zakljucaju.", {
      refreshSeats: true,
    });
  }

  res.json({
    success: true,
    checkoutKey,
    expiresAt,
    lockDurationMinutes: event.lockDurationMinutes || 15,
    seats: seats.map((seat) => ({
      seatId: seat._id,
      label: seat.label,
      section: seat.section,
      row: seat.row,
      number: seat.number,
      price: pricesBySeat.get(String(seat._id)),
      lockId: locks.find((lock) => String(lock.seat) === String(seat._id))?._id,
      availabilityStatus: "locked",
    })),
  });
});

const restoreSeatLocks = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();
  const sessionId = String(req.query.sessionId || "").trim();
  if (!sessionId) {
    const error = new Error("sessionId je obavezan.");
    error.statusCode = 400;
    throw error;
  }
  const event = await getEventWithTicketing(req.params.eventId);
  const locks = await SeatLock.find({
    event: event._id,
    sessionId,
    status: "active",
    expiresAt: { $gt: new Date() },
  })
    .populate({ path: "seat", populate: [{ path: "priceCategory" }] })
    .sort("-updatedAt");
  if (!locks.length) {
    return res.json({ success: true, restored: false, seats: [] });
  }
  const checkoutKey = locks[0].checkoutKey || "";
  const checkoutLocks = checkoutKey
    ? locks.filter((lock) => lock.checkoutKey === checkoutKey)
    : locks;
  const expiresAt = checkoutLocks.reduce(
    (latest, lock) => !latest || lock.expiresAt < latest ? lock.expiresAt : latest,
    null
  );
  return res.json({
    success: true,
    restored: true,
    checkoutKey,
    expiresAt,
    lockDurationMinutes: event.lockDurationMinutes || 15,
    seats: checkoutLocks.map((lock) => ({
      seatId: lock.seat._id,
      label: lock.seat.label,
      section: lock.seat.section,
      row: lock.seat.row,
      number: lock.seat.number,
      price: getSeatPrice(lock.seat, event.pricePlan),
      lockId: lock._id,
      availabilityStatus: "locked",
    })),
  });
});

const releaseSeats = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();
  const seatIds = normalizeSeatIds(req.body.seatIds);
  const sessionId = String(req.body.sessionId || "").trim();
  const checkoutKey = String(req.body.checkoutKey || "").trim();
  if (!sessionId) {
    const error = new Error("sessionId je obavezan.");
    error.statusCode = 400;
    throw error;
  }
  if (!seatIds.length && !checkoutKey) {
    const error = new Error("seatIds ili checkoutKey je obavezan.");
    error.statusCode = 400;
    throw error;
  }
  const filter = {
    event: req.params.eventId,
    sessionId,
    status: "active",
  };
  if (seatIds.length) filter.seat = { $in: seatIds };
  if (checkoutKey) filter.checkoutKey = checkoutKey;
  const result = await SeatLock.updateMany(filter, { $set: { status: "released" } });
  res.json({ success: true, releasedCount: result.modifiedCount });
});

const persistOrderAttempt = async ({
  event,
  seats,
  activeLocks,
  customerSnapshot,
  action,
  sessionId,
  idempotencyKey,
  checkoutKey,
  notes,
  locale,
}, dbSession = null) => {
  let subtotalAmount = 0;
  const itemStatus = action === "purchase" ? "pending_payment" : "reserved";
  const productionId = event.production?._id || event.production;
  const orderLocale = normalizeLocale(locale);
  const productionTitle = localizedValue(event.production, "title", orderLocale, { fallback: orderLocale === "sr" });
  const venueId = event.venue?._id || event.venue;
  const venueName = localizedValue(event.venue, "name", orderLocale, { fallback: orderLocale === "sr" });
  const orderItemsPayload = seats.map((seat) => {
    const price = getSeatPrice(seat, event.pricePlan);
    if (!price) {
      const error = new Error(`Sediste ${seat.label} nema vazecu cenu.`);
      error.statusCode = 400;
      throw error;
    }
    subtotalAmount += price.amount;
    return {
      event: event._id,
      production: productionId,
      productionTitle,
      eventStartsAt: event.startsAt,
      venueName,
      seat: seat._id,
      seatLabel: seat.label,
      section: seat.section,
      row: seat.row,
      number: seat.number,
      priceCategory: seat.priceCategory?._id,
      priceCategoryCode: seat.priceCategory?.code || "",
      priceCategoryName: seat.priceCategory?.name || "",
      unitPrice: price.amount,
      discountAmount: 0,
      finalPrice: price.amount,
      currency: price.currency,
      status: itemStatus,
    };
  });

  const expiresAt = getPublicExpiry(event, action);
  let order = null;
  try {
    const orderPayload = {
      locale: orderLocale,
      customerSnapshot,
      orderType: action === "purchase" ? "purchase" : "reservation",
      sessionId,
      idempotencyKey,
      event: event._id,
      eventSnapshot: {
        productionId,
        productionTitle,
        eventStartsAt: event.startsAt,
        eventEndsAt: event.endsAt,
        venueId,
        venueName,
        venueStage: venueName,
      },
      subtotalAmount,
      discountAmount: 0,
      totalAmount: subtotalAmount,
      currency: event.pricePlan?.currency || "RSD",
      status: action === "purchase" ? "pending_payment" : "reserved",
      paymentStatus: action === "purchase" ? "pending" : "unpaid",
      paymentProvider: action === "purchase" ? "internal" : "none",
      expiresAt,
      reservationExpiresAt: action === "reserve" ? expiresAt : undefined,
      paymentExpiresAt: action === "purchase" ? expiresAt : undefined,
      notes: String(notes || "").trim(),
      statusHistory: [{
        fromStatus: "",
        toStatus: action === "purchase" ? "pending_payment" : "reserved",
        source: "public",
        changedAt: new Date(),
      }],
    };
    order = dbSession
      ? (await Order.create([orderPayload], { session: dbSession }))[0]
      : await Order.create(orderPayload);
    const accessToken = assignNewPublicAccessToken(order);
    await order.save({ session: dbSession || undefined });
    const items = await OrderItem.insertMany(
      orderItemsPayload.map((item) => ({ ...item, order: order._id })),
      { session: dbSession || undefined }
    );
    order.items = items.map((item) => item._id);
    await order.save({ session: dbSession || undefined });

    const lockResult = await SeatLock.updateMany(
      {
        _id: { $in: activeLocks.map((lock) => lock._id) },
        event: event._id,
        sessionId,
        checkoutKey,
        status: "active",
        expiresAt: { $gt: new Date() },
      },
      { $set: { status: "converted", order: order._id } },
      { session: dbSession || undefined }
    );
    if (lockResult.modifiedCount !== activeLocks.length) {
      throw conflict("Zakljucavanje sedista je isteklo tokom potvrde.", {
        refreshSeats: true,
      });
    }
    return { order, accessToken };
  } catch (error) {
    if (order && !dbSession) {
      await SeatLock.updateMany(
        { order: order._id, status: "converted" },
        { $set: { status: "active" }, $unset: { order: "" } }
      );
      await OrderItem.deleteMany({ order: order._id });
      await Order.deleteOne({ _id: order._id });
    }
    throw error;
  }
};

const transactionIsUnsupported = (error) => (
  error?.code === 20
  || /Transaction numbers are only allowed|replica set member or mongos|does not support retryable writes/i.test(
    String(error?.message || "")
  )
);

const persistOrder = async (payload) => {
  const session = await mongoose.startSession();
  try {
    let result = null;
    await session.withTransaction(async () => {
      result = await persistOrderAttempt(payload, session);
    });
    return result;
  } catch (error) {
    if (!transactionIsUnsupported(error)) throw error;
    return persistOrderAttempt(payload);
  } finally {
    await session.endSession();
  }
};

const createOrder = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();
  const action = normalizeOrderAction(req.body.action);
  const eventId = String(req.body.eventId || "").trim();
  const seatIds = normalizeSeatIds(req.body.seatIds);
  const sessionId = String(req.body.sessionId || "").trim();
  const checkoutKey = String(req.body.checkoutKey || "").trim();
  const idempotencyKey = String(req.body.idempotencyKey || checkoutKey || "").trim();

  if (!eventId || !action || !seatIds.length || !sessionId || !checkoutKey || !idempotencyKey) {
    const error = new Error(
      "eventId, action, seatIds, sessionId, checkoutKey i idempotencyKey su obavezni."
    );
    error.statusCode = 400;
    throw error;
  }

  const existing = await populateOrder(
    Order.findOne({ idempotencyKey }).select("+sessionId +idempotencyKey")
  );
  if (existing) {
    if (existing.sessionId !== sessionId) {
      throw conflict("Ovaj zahtev je vec upotrebljen u drugoj sesiji.");
    }
    return res.json({
      success: true,
      idempotent: true,
      action: existing.orderType === "purchase" ? "purchase" : "reserve",
      order: publicOrderDto(existing),
    });
  }

  const event = await getEventWithTicketing(eventId, { requireOnSale: true });
  if (!event.ticketing?.enabled || event.saleStatus !== "on_sale") {
    throw conflict("Prodaja ulaznica trenutno nije aktivna.");
  }
  if (seatIds.length > event.maxTicketsPerOrder) {
    const error = new Error(`Najvise ${event.maxTicketsPerOrder} ulaznica po porudzbini.`);
    error.statusCode = 400;
    throw error;
  }

  const customerSnapshot = normalizeCustomerSnapshot(req.body.customerSnapshot);
  if (!customerSnapshot.firstName || !customerSnapshot.lastName || !customerSnapshot.email) {
    const error = new Error("Ime, prezime i email su obavezni.");
    error.statusCode = 400;
    error.details = {
      firstName: !customerSnapshot.firstName ? "Ime je obavezno." : undefined,
      lastName: !customerSnapshot.lastName ? "Prezime je obavezno." : undefined,
      email: !customerSnapshot.email ? "Email je obavezan." : undefined,
    };
    throw error;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerSnapshot.email)) {
    const error = new Error("Email adresa nije ispravna.");
    error.statusCode = 400;
    error.details = { email: "Unesite ispravnu email adresu." };
    throw error;
  }

  const seats = await Seat.find({
    _id: { $in: seatIds },
    seatMap: event.seatMap._id,
    isActive: true,
  }).populate("priceCategory");
  if (seats.length !== seatIds.length) {
    const error = new Error("Neka sedista ne pripadaju mapi ovog termina.");
    error.statusCode = 400;
    throw error;
  }

  const activeLocks = await SeatLock.find({
    event: event._id,
    seat: { $in: seatIds },
    sessionId,
    checkoutKey,
    status: "active",
    expiresAt: { $gt: new Date() },
  });
  if (activeLocks.length !== seatIds.length) {
    throw conflict("Zakljucavanje sedista je isteklo ili nije potpuno.", {
      refreshSeats: true,
    });
  }

  let persisted;
  try {
    persisted = await persistOrder({
      event,
      seats,
      activeLocks,
      customerSnapshot,
      action,
      sessionId,
      idempotencyKey,
      checkoutKey,
      notes: req.body.notes,
      locale: req.locale,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const duplicate = await populateOrder(
        Order.findOne({ idempotencyKey }).select("+sessionId +idempotencyKey")
      );
      if (duplicate?.sessionId === sessionId) {
        return res.json({
          success: true,
          idempotent: true,
          action,
          order: publicOrderDto(duplicate),
        });
      }
    }
    throw error;
  }

  const populatedOrder = await populateOrder(Order.findById(persisted.order._id));
  const delivery = await sendOrderConfirmation(populatedOrder, persisted.accessToken);
  const baseUrl = String(process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || "http://localhost:4200")
    .replace(/\/+$/, "");
  res.status(201).json({
    success: true,
    action,
    order: publicOrderDto(populatedOrder),
    accessToken: persisted.accessToken,
    secureOrderUrl: `${baseUrl}${req.locale === "en" ? "/en/order" : "/porudzbina"}/${encodeURIComponent(populatedOrder.orderCode)}?token=${encodeURIComponent(persisted.accessToken)}`,
    emailStatus: delivery.sent ? "sent" : populatedOrder.emailDelivery?.status || "failed",
  });
});

const findPublicOrder = async ({ reference, token, sessionId, email }) => {
  const normalizedReference = String(reference || "").trim();
  if (!normalizedReference || mongoose.Types.ObjectId.isValid(normalizedReference)) {
    return null;
  }
  const order = await populateOrder(
    Order.findOne({ orderCode: normalizedReference })
      .select("+sessionId +publicAccessTokenHash"),
    { includeSecrets: true }
  );
  if (!order) return null;
  await expireOrderIfNeeded(order);
  const tokenAllowed = tokenMatchesHash(token, order.publicAccessTokenHash);
  const sessionAllowed = Boolean(sessionId && order.sessionId === sessionId);
  const emailAllowed = Boolean(
    email && order.customerSnapshot?.email
    && order.customerSnapshot.email === String(email).trim().toLowerCase()
  );
  if (!tokenAllowed && !sessionAllowed && !emailAllowed) {
    const error = new Error("Pristup porudzbini nije dozvoljen.");
    error.statusCode = 403;
    throw error;
  }
  return populateOrder(Order.findById(order._id));
};

const getPublicOrder = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();
  const order = await findPublicOrder({
    reference: req.params.identifier,
    token: req.query.token,
    sessionId: req.query.sessionId,
  });
  if (!order) {
    const error = new Error("Porudzbina nije pronadjena.");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, order: publicOrderDto(order) });
});

const lookupPublicOrder = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();
  const order = await findPublicOrder({
    reference: req.body.reference,
    email: req.body.email,
  });
  if (!order) {
    const error = new Error("Porudzbina nije pronadjena.");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, order: publicOrderDto(order) });
});

module.exports = {
  createOrder,
  getEventSeats,
  getPublicOrder,
  lockSeats,
  lookupPublicOrder,
  releaseSeats,
  restoreSeatLocks,
};
