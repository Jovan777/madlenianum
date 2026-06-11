const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");

const Event = require("../models/Event");
const Seat = require("../models/Seat");
const SeatLock = require("../models/SeatLock");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");

const getSeatPrice = (seat, pricePlan) => {
  if (!pricePlan || !Array.isArray(pricePlan.rules)) {
    return null;
  }

  if (!seat.priceCategory) {
    return null;
  }

  const seatPriceCategoryId = String(seat.priceCategory._id || seat.priceCategory);

  let rule = pricePlan.rules.find((item) => {
    if (!item.priceCategory) return false;

    const rulePriceCategoryId = String(
      item.priceCategory._id || item.priceCategory
    );

    return rulePriceCategoryId === seatPriceCategoryId;
  });

  if (!rule) {
    rule = pricePlan.rules.find((item) => {
      return item.priceCategory && item.priceCategory.code === "ALL";
    });
  }

  if (!rule) {
    return null;
  }

  return {
    amount: rule.amount,
    currency: pricePlan.currency || "RSD",
    priceCategory: seat.priceCategory,
  };
};

const expireOldLocksAndOrders = async () => {
  const now = new Date();

  await SeatLock.updateMany(
    {
      status: "active",
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: "expired",
      },
    }
  );

  const expiredOrders = await Order.find({
    status: { $in: ["pending", "reserved"] },
    expiresAt: { $lte: now },
  }).select("_id");

  const expiredOrderIds = expiredOrders.map((item) => item._id);

  if (expiredOrderIds.length > 0) {
    await Order.updateMany(
      {
        _id: { $in: expiredOrderIds },
      },
      {
        $set: {
          status: "expired",
          paymentStatus: "cancelled",
        },
      }
    );

    await OrderItem.updateMany(
      {
        order: { $in: expiredOrderIds },
        status: { $in: ["pending", "reserved"] },
      },
      {
        $set: {
          status: "cancelled",
        },
      }
    );
  }
};

const getActiveOrderSeatStatuses = async (eventId) => {
  const now = new Date();

  const activeOrders = await Order.find({
    event: eventId,
    $or: [
      {
        status: "paid",
      },
      {
        status: "reserved",
        expiresAt: { $gt: now },
      },
    ],
  }).select("_id status");

  const orderStatusById = new Map();

  activeOrders.forEach((order) => {
    orderStatusById.set(String(order._id), order.status);
  });

  const orderIds = activeOrders.map((order) => order._id);

  const soldSeatIds = new Set();
  const reservedSeatIds = new Set();

  if (orderIds.length === 0) {
    return {
      soldSeatIds,
      reservedSeatIds,
    };
  }

  const orderItems = await OrderItem.find({
    event: eventId,
    order: { $in: orderIds },
    status: { $in: ["reserved", "paid"] },
  }).select("seat order status");

  orderItems.forEach((item) => {
    const parentOrderStatus = orderStatusById.get(String(item.order));

    if (parentOrderStatus === "paid" || item.status === "paid") {
      soldSeatIds.add(String(item.seat));
    } else {
      reservedSeatIds.add(String(item.seat));
    }
  });

  return {
    soldSeatIds,
    reservedSeatIds,
  };
};

const getEventWithTicketing = async (eventId) => {
  const event = await Event.findById(eventId)
    .populate({
      path: "production",
      populate: [{ path: "poster" }],
    })
    .populate("venue")
    .populate("seatMap")
    .populate({
      path: "pricePlan",
      populate: [{ path: "rules.priceCategory" }],
    });

  if (!event) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!event.seatMap) {
    const error = new Error("Event does not have a seat map.");
    error.statusCode = 400;
    throw error;
  }

  return event;
};

const normalizeSeatIds = (seatIds) => {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return [];
  }

  return [...new Set(seatIds.map((id) => String(id)))];
};

const isSameLockOwner = (lock, { sessionId, customerId }) => {
  const lockSessionId = lock.sessionId || "";
  const lockCustomerId = lock.customer ? String(lock.customer) : "";

  if (sessionId && lockSessionId && lockSessionId === sessionId) {
    return true;
  }

  if (customerId && lockCustomerId && lockCustomerId === String(customerId)) {
    return true;
  }

  return false;
};

const getOwnerFilter = ({ sessionId, customerId }) => {
  const ownerConditions = [];

  if (sessionId) {
    ownerConditions.push({ sessionId });
  }

  if (customerId) {
    ownerConditions.push({ customer: customerId });
  }

  if (ownerConditions.length === 0) {
    return null;
  }

  return {
    $or: ownerConditions,
  };
};

const getEventSeats = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();

  const event = await getEventWithTicketing(req.params.eventId);

  const seats = await Seat.find({
    seatMap: event.seatMap._id,
    isActive: true,
  })
    .populate("priceCategory")
    .sort("section sortOrder row number label");

  const activeLocks = await SeatLock.find({
    event: event._id,
    status: "active",
    expiresAt: { $gt: new Date() },
  }).select("seat sessionId customer expiresAt");

  const lockedSeatIds = new Set(
    activeLocks.map((lock) => String(lock.seat))
  );

  const { soldSeatIds, reservedSeatIds } = await getActiveOrderSeatStatuses(
    event._id
  );

  const seatItems = seats.map((seat) => {
    const seatId = String(seat._id);
    const price = getSeatPrice(seat, event.pricePlan);

    let availabilityStatus = "available";

    if (!seat.isSellable || seat.seatType === "unavailable") {
      availabilityStatus = "unavailable";
    } else if (soldSeatIds.has(seatId)) {
      availabilityStatus = "sold";
    } else if (reservedSeatIds.has(seatId)) {
      availabilityStatus = "reserved";
    } else if (lockedSeatIds.has(seatId)) {
      availabilityStatus = "locked";
    }

    return {
      id: seat._id,
      section: seat.section,
      row: seat.row,
      number: seat.number,
      label: seat.label,
      seatType: seat.seatType,
      visualGroup: seat.visualGroup || "",
      x: seat.x,
      y: seat.y,
      width: seat.width,
      height: seat.height,
      rotation: seat.rotation,
      isSellable: seat.isSellable,
      priceCategory: seat.priceCategory,
      price,
      availabilityStatus,
    };
  });

  res.json({
    success: true,
    event: {
      id: event._id,
      production: event.production,
      venue: event.venue,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      saleStatus: event.saleStatus,
      ticketing: event.ticketing,
      seatMap: event.seatMap,
      pricePlan: event.pricePlan,
      maxTicketsPerOrder: event.maxTicketsPerOrder,
      lockDurationMinutes: event.lockDurationMinutes,
    },
    seats: seatItems,
  });
});

const lockSeats = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();

  const event = await getEventWithTicketing(req.params.eventId);

  if (!event.ticketing?.enabled) {
    res.status(400);
    throw new Error("Ticketing is not enabled for this event.");
  }

  if (event.saleStatus !== "on_sale") {
    res.status(400);
    throw new Error("Tickets are not currently on sale for this event.");
  }

  const seatIds = normalizeSeatIds(req.body.seatIds);
  const sessionId = req.body.sessionId ? String(req.body.sessionId).trim() : "";
  const customerId = req.body.customerId || null;

  if (seatIds.length === 0) {
    res.status(400);
    throw new Error("seatIds array is required.");
  }

  if (!sessionId && !customerId) {
    res.status(400);
    throw new Error("sessionId or customerId is required.");
  }

  if (seatIds.length > event.maxTicketsPerOrder) {
    res.status(400);
    throw new Error(`Maximum ${event.maxTicketsPerOrder} tickets per order.`);
  }

  const seats = await Seat.find({
    _id: { $in: seatIds },
    seatMap: event.seatMap._id,
    isActive: true,
  }).populate("priceCategory");

  if (seats.length !== seatIds.length) {
    res.status(400);
    throw new Error("Some seats do not exist in this event seat map.");
  }

  const invalidSeat = seats.find(
    (seat) => !seat.isSellable || seat.seatType === "unavailable"
  );

  if (invalidSeat) {
    res.status(400);
    throw new Error(`Seat ${invalidSeat.label} is not sellable.`);
  }

  const { soldSeatIds, reservedSeatIds } = await getActiveOrderSeatStatuses(
    event._id
  );

  const alreadyTakenSeat = seats.find((seat) => {
    const seatId = String(seat._id);
    return soldSeatIds.has(seatId) || reservedSeatIds.has(seatId);
  });

  if (alreadyTakenSeat) {
    res.status(409);
    throw new Error(`Seat ${alreadyTakenSeat.label} is already reserved or sold.`);
  }

  const activeLocks = await SeatLock.find({
    event: event._id,
    seat: { $in: seatIds },
    status: "active",
    expiresAt: { $gt: new Date() },
  });

  const foreignLock = activeLocks.find(
    (lock) => !isSameLockOwner(lock, { sessionId, customerId })
  );

  if (foreignLock) {
    const lockedSeat = seats.find(
      (seat) => String(seat._id) === String(foreignLock.seat)
    );

    res.status(409);
    throw new Error(
      `Seat ${lockedSeat ? lockedSeat.label : foreignLock.seat} is already locked.`
    );
  }

  const expiresAt = new Date(
    Date.now() + (event.lockDurationMinutes || 15) * 60 * 1000
  );

  const lockedSeats = [];

  for (const seat of seats) {
    const price = getSeatPrice(seat, event.pricePlan);

    if (!price) {
      res.status(400);
      throw new Error(`Seat ${seat.label} does not have a valid price.`);
    }

    const existingOwnerLock = activeLocks.find(
      (lock) =>
        String(lock.seat) === String(seat._id) &&
        isSameLockOwner(lock, { sessionId, customerId })
    );

    if (existingOwnerLock) {
      existingOwnerLock.expiresAt = expiresAt;
      await existingOwnerLock.save();

      lockedSeats.push({
        seat,
        lock: existingOwnerLock,
        price,
      });
    } else {
      const lock = await SeatLock.create({
        event: event._id,
        seat: seat._id,
        customer: customerId || undefined,
        sessionId,
        expiresAt,
        status: "active",
      });

      lockedSeats.push({
        seat,
        lock,
        price,
      });
    }
  }

  res.json({
    success: true,
    expiresAt,
    lockDurationMinutes: event.lockDurationMinutes || 15,
    seats: lockedSeats.map(({ seat, lock, price }) => ({
      seatId: seat._id,
      label: seat.label,
      section: seat.section,
      row: seat.row,
      number: seat.number,
      price,
      lockId: lock._id,
      availabilityStatus: "locked",
    })),
  });
});

const releaseSeats = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();

  const eventId = req.params.eventId;
  const seatIds = normalizeSeatIds(req.body.seatIds);
  const sessionId = req.body.sessionId ? String(req.body.sessionId).trim() : "";
  const customerId = req.body.customerId || null;

  if (seatIds.length === 0) {
    res.status(400);
    throw new Error("seatIds array is required.");
  }

  const ownerFilter = getOwnerFilter({ sessionId, customerId });

  if (!ownerFilter) {
    res.status(400);
    throw new Error("sessionId or customerId is required.");
  }

  const result = await SeatLock.updateMany(
    {
      event: eventId,
      seat: { $in: seatIds },
      status: "active",
      ...ownerFilter,
    },
    {
      $set: {
        status: "released",
      },
    }
  );

  res.json({
    success: true,
    releasedCount: result.modifiedCount,
  });
});

const createOrder = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();

  const { eventId, customerSnapshot, notes } = req.body;
  const seatIds = normalizeSeatIds(req.body.seatIds);
  const sessionId = req.body.sessionId ? String(req.body.sessionId).trim() : "";
  const customerId = req.customer?._id || null;

  if (!eventId) {
    res.status(400);
    throw new Error("eventId is required.");
  }

  if (seatIds.length === 0) {
    res.status(400);
    throw new Error("seatIds array is required.");
  }

  if (!sessionId && !customerId) {
    res.status(400);
    throw new Error("sessionId is required for guest orders.");
  }

  const event = await getEventWithTicketing(eventId);

  if (!event.ticketing?.enabled) {
    res.status(400);
    throw new Error("Ticketing is not enabled for this event.");
  }

  if (event.saleStatus !== "on_sale") {
    res.status(400);
    throw new Error("Tickets are not currently on sale for this event.");
  }

  if (seatIds.length > event.maxTicketsPerOrder) {
    res.status(400);
    throw new Error(`Maximum ${event.maxTicketsPerOrder} tickets per order.`);
  }

  let finalCustomerSnapshot = customerSnapshot || {};

  if (req.customer) {
    finalCustomerSnapshot = {
      fullName: req.customer.fullName,
      email: req.customer.email,
      address: req.customer.address,
      postalCode: req.customer.postalCode,
      city: req.customer.city,
      country: req.customer.country,
      phone: req.customer.phone,
    };
  }

  if (!finalCustomerSnapshot.fullName || !finalCustomerSnapshot.email) {
    res.status(400);
    throw new Error("Customer fullName and email are required.");
  }

  const seats = await Seat.find({
    _id: { $in: seatIds },
    seatMap: event.seatMap._id,
    isActive: true,
  }).populate("priceCategory");

  if (seats.length !== seatIds.length) {
    res.status(400);
    throw new Error("Some seats do not exist in this event seat map.");
  }

  const invalidSeat = seats.find(
    (seat) => !seat.isSellable || seat.seatType === "unavailable"
  );

  if (invalidSeat) {
    res.status(400);
    throw new Error(`Seat ${invalidSeat.label} is not sellable.`);
  }

  const { soldSeatIds, reservedSeatIds } = await getActiveOrderSeatStatuses(
    event._id
  );

  const alreadyTakenSeat = seats.find((seat) => {
    const seatId = String(seat._id);
    return soldSeatIds.has(seatId) || reservedSeatIds.has(seatId);
  });

  if (alreadyTakenSeat) {
    res.status(409);
    throw new Error(`Seat ${alreadyTakenSeat.label} is already reserved or sold.`);
  }

  const ownerFilter = getOwnerFilter({ sessionId, customerId });

  if (!ownerFilter) {
    res.status(400);
    throw new Error("Valid lock owner is required.");
  }

  const activeLocks = await SeatLock.find({
    event: event._id,
    seat: { $in: seatIds },
    status: "active",
    expiresAt: { $gt: new Date() },
    ...ownerFilter,
  });

  if (activeLocks.length !== seatIds.length) {
    res.status(409);
    throw new Error("All selected seats must be locked before creating order.");
  }

  const lockExpiresAtValues = activeLocks.map((lock) => lock.expiresAt.getTime());
  const orderExpiresAt = new Date(Math.min(...lockExpiresAtValues));

  let subtotalAmount = 0;

  const order = await Order.create({
    customer: customerId || undefined,
    customerSnapshot: finalCustomerSnapshot,
    sessionId,
    event: event._id,
    subtotalAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    currency: event.pricePlan?.currency || "RSD",
    status: "reserved",
    paymentStatus: "unpaid",
    paymentProvider: "none",
    expiresAt: orderExpiresAt,
    notes: notes || "",
  });

  const orderItemsPayload = seats.map((seat) => {
    const price = getSeatPrice(seat, event.pricePlan);

    if (!price) {
      throw new Error(`Seat ${seat.label} does not have a valid price.`);
    }

    subtotalAmount += price.amount;

    return {
      order: order._id,
      event: event._id,
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
      status: "reserved",
    };
  });

  const orderItems = await OrderItem.insertMany(orderItemsPayload);

  order.items = orderItems.map((item) => item._id);
  order.subtotalAmount = subtotalAmount;
  order.totalAmount = subtotalAmount;
  order.currency = event.pricePlan?.currency || "RSD";
  await order.save();

  await SeatLock.updateMany(
    {
      _id: { $in: activeLocks.map((lock) => lock._id) },
    },
    {
      $set: {
        status: "converted",
        order: order._id,
      },
    }
  );

  const populatedOrder = await Order.findById(order._id)
    .populate({
      path: "event",
      populate: [
        { path: "production" },
        { path: "venue" },
      ],
    })
    .populate({
      path: "items",
      populate: [{ path: "seat" }, { path: "priceCategory" }],
    });

  res.status(201).json({
    success: true,
    order: populatedOrder,
  });
});

const getPublicOrder = asyncHandler(async (req, res) => {
  await expireOldLocksAndOrders();

  const identifier = req.params.identifier;
  const sessionId = req.query.sessionId ? String(req.query.sessionId).trim() : "";

  const orderQuery = mongoose.Types.ObjectId.isValid(identifier)
    ? {
        $or: [{ _id: identifier }, { orderCode: identifier }],
      }
    : {
        orderCode: identifier,
      };

  const order = await Order.findOne(orderQuery)
    .populate({
      path: "event",
      populate: [
        { path: "production" },
        { path: "venue" },
      ],
    })
    .populate({
      path: "items",
      populate: [{ path: "seat" }, { path: "priceCategory" }],
    });

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (!order.customer && order.sessionId && order.sessionId !== sessionId) {
    res.status(403);
    throw new Error("Invalid session for this order.");
  }

  res.json({
    success: true,
    order,
  });
});

module.exports = {
  getEventSeats,
  lockSeats,
  releaseSeats,
  createOrder,
  getPublicOrder,
};