const EventSeatOverride = require("../models/EventSeatOverride");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Seat = require("../models/Seat");
const SeatLock = require("../models/SeatLock");

const idOf = (value) => String(value?._id || value?.id || value || "");

const getSeatPrice = (seat, pricePlan) => {
  if (!pricePlan || !Array.isArray(pricePlan.rules) || !seat.priceCategory) {
    return null;
  }
  const seatCategoryId = idOf(seat.priceCategory);
  const categoryRule = pricePlan.rules.find(
    (rule) => rule.priceCategory && idOf(rule.priceCategory) === seatCategoryId
  );
  const allRule = pricePlan.rules.find(
    (rule) => rule.priceCategory?.code === "ALL"
  );
  const rule = categoryRule || allRule;
  if (!rule) return null;
  return {
    amount: Number(rule.amount),
    currency: pricePlan.currency || "RSD",
    priceCategory: seat.priceCategory,
  };
};

const loadOrderState = async (eventId) => {
  const now = new Date();
  const orders = await Order.find({
    event: eventId,
    $or: [
      { status: "paid" },
      {
        status: "reserved",
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: now } },
        ],
      },
    ],
  }).select("_id status");
  const statusByOrder = new Map(
    orders.map((order) => [String(order._id), order.status])
  );
  const items = orders.length
    ? await OrderItem.find({
        event: eventId,
        order: { $in: orders.map((order) => order._id) },
        status: { $in: ["reserved", "paid"] },
      }).select("seat order status")
    : [];
  const soldSeatIds = new Set();
  const reservedSeatIds = new Set();
  items.forEach((item) => {
    const seatId = String(item.seat);
    if (item.status === "paid" || statusByOrder.get(String(item.order)) === "paid") {
      soldSeatIds.add(seatId);
    } else {
      reservedSeatIds.add(seatId);
    }
  });
  return { soldSeatIds, reservedSeatIds };
};

const calculateEffectiveSeatStates = async (event, options = {}) => {
  const seatMapId = idOf(event.seatMap);
  const now = new Date();
  const seats = options.seats || await Seat.find({ seatMap: seatMapId })
    .populate("priceCategory")
    .sort("section sortOrder row number label");
  const [overrides, locks, orderState] = await Promise.all([
    EventSeatOverride.find({
      event: event._id,
      seatMap: seatMapId,
      active: true,
    }).populate("createdBy", "username email").populate("updatedBy", "username email"),
    SeatLock.find({
      event: event._id,
      status: "active",
      expiresAt: { $gt: now },
    }).select("seat sessionId customer expiresAt"),
    loadOrderState(event._id),
  ]);

  const overrideBySeat = new Map(
    overrides.map((override) => [String(override.seat), override])
  );
  const lockBySeat = new Map(
    locks.map((lock) => [String(lock.seat), lock])
  );

  const items = seats.map((seat) => {
    const seatId = String(seat._id);
    const override = overrideBySeat.get(seatId) || null;
    const lock = lockBySeat.get(seatId) || null;
    let effectiveState = "available";
    let publicMessage = "";

    if (!seat.isActive || !seat.isSellable || seat.seatType === "unavailable") {
      effectiveState = "unavailable";
    } else if (orderState.soldSeatIds.has(seatId)) {
      effectiveState = "sold";
    } else if (orderState.reservedSeatIds.has(seatId)) {
      effectiveState = "reserved";
    } else if (override) {
      effectiveState = override.type === "box_office_only"
        ? "box_office_only"
        : "unavailable";
      publicMessage = override.publicMessage || "";
    } else if (lock) {
      effectiveState = "locked";
    }

    return {
      seat,
      effectiveState,
      price: getSeatPrice(seat, event.pricePlan),
      override,
      lock,
      publicMessage,
    };
  });

  return {
    items,
    overrides,
    counts: items.reduce((result, item) => {
      result[item.effectiveState] = (result[item.effectiveState] || 0) + 1;
      return result;
    }, {}),
  };
};

const publicSeatDto = (item) => {
  const { seat } = item;
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
    isSellable: item.effectiveState === "available",
    isAccessible: Boolean(seat.isAccessible || seat.seatType === "wheelchair"),
    isCompanion: Boolean(seat.isCompanion),
    hasRestrictedView: Boolean(seat.hasRestrictedView),
    priceCategory: seat.priceCategory,
    price: item.price,
    availabilityStatus: item.effectiveState,
    ...(item.publicMessage ? { publicMessage: item.publicMessage } : {}),
  };
};

const adminSeatDto = (item) => ({
  ...publicSeatDto(item),
  isActive: Boolean(item.seat.isActive),
  baseIsSellable: Boolean(item.seat.isSellable),
  physicalNote: item.seat.physicalNote || "",
  override: item.override
    ? {
        _id: item.override._id,
        type: item.override.type,
        internalReason: item.override.internalReason,
        publicMessage: item.override.publicMessage,
        active: item.override.active,
        createdBy: item.override.createdBy,
        updatedBy: item.override.updatedBy,
        createdAt: item.override.createdAt,
        updatedAt: item.override.updatedAt,
      }
    : null,
  lock: item.lock
    ? {
        expiresAt: item.lock.expiresAt,
      }
    : null,
});

module.exports = {
  adminSeatDto,
  calculateEffectiveSeatStates,
  getSeatPrice,
  publicSeatDto,
};
