const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const { ACTIVE_ORDER_STATUSES } = require("../constants/order.constants");

const ALLOWED_TRANSITIONS = {
  pending: ["reserved", "pending_payment", "cancelled", "expired"],
  reserved: ["paid", "cancelled", "expired"],
  pending_payment: ["paid", "cancelled", "expired"],
  paid: [],
  expired: [],
  cancelled: [],
  refunded: [],
};

const conflict = (message, details) => {
  const error = new Error(message);
  error.statusCode = 409;
  error.details = details;
  return error;
};

const getOrderExpiry = (order) => {
  if (order.status === "reserved") {
    return order.reservationExpiresAt || order.expiresAt || null;
  }
  if (["pending", "pending_payment"].includes(order.status)) {
    return order.paymentExpiresAt || order.expiresAt || null;
  }
  return null;
};

const isOrderExpired = (order, now = new Date()) => {
  if (!ACTIVE_ORDER_STATUSES.includes(order.status) && order.status !== "pending") {
    return false;
  }
  const expiresAt = getOrderExpiry(order);
  return Boolean(expiresAt && new Date(expiresAt) <= now);
};

const assertTransitionAllowed = (fromStatus, toStatus) => {
  if (fromStatus === toStatus) return;
  if (!(ALLOWED_TRANSITIONS[fromStatus] || []).includes(toStatus)) {
    throw conflict(
      `Promena statusa iz "${fromStatus}" u "${toStatus}" nije dozvoljena.`,
      { fromStatus, toStatus }
    );
  }
};

const itemStatusForOrderStatus = (status) => {
  if (status === "paid") return "paid";
  if (status === "pending_payment") return "pending_payment";
  if (status === "reserved") return "reserved";
  if (["expired", "cancelled"].includes(status)) return "cancelled";
  return "pending";
};

const transitionOrder = async (
  order,
  toStatus,
  { adminId, reason = "", source = "system", session } = {}
) => {
  const fromStatus = order.status;
  assertTransitionAllowed(fromStatus, toStatus);
  if (fromStatus === toStatus) return order;

  const now = new Date();
  order.status = toStatus;
  order.statusHistory.push({
    fromStatus,
    toStatus,
    reason: String(reason || "").trim(),
    changedBy: adminId || undefined,
    source,
    changedAt: now,
  });

  if (toStatus === "paid") {
    order.paymentStatus = "paid";
    order.paidAt = now;
    order.expiresAt = undefined;
    order.reservationExpiresAt = undefined;
    order.paymentExpiresAt = undefined;
  } else if (toStatus === "cancelled") {
    order.paymentStatus = "cancelled";
    order.cancelledAt = now;
  } else if (toStatus === "expired") {
    order.paymentStatus = "cancelled";
    order.expiredAt = now;
  } else if (toStatus === "pending_payment") {
    order.orderType = "purchase";
    order.paymentStatus = "pending";
  } else if (toStatus === "reserved") {
    order.orderType = "reservation";
    order.paymentStatus = "unpaid";
  }

  await order.save({ session });
  await OrderItem.updateMany(
    { order: order._id },
    { $set: { status: itemStatusForOrderStatus(toStatus) } },
    { session }
  );
  return order;
};

const expireOrderIfNeeded = async (order, options = {}) => {
  if (!isOrderExpired(order)) return false;
  await transitionOrder(order, "expired", {
    reason: options.reason || "Automatski istek roka.",
    source: "system",
    session: options.session,
  });
  return true;
};

const processExpiredOrders = async ({ limit = 250 } = {}) => {
  const now = new Date();
  const orders = await Order.find({
    status: { $in: ["pending", "reserved", "pending_payment"] },
    $or: [
      { reservationExpiresAt: { $lte: now } },
      { paymentExpiresAt: { $lte: now } },
      { expiresAt: { $lte: now } },
    ],
  })
    .sort("createdAt")
    .limit(limit);

  let expiredCount = 0;
  for (const order of orders) {
    if (await expireOrderIfNeeded(order)) {
      expiredCount += 1;
      try {
        const { assignNewPublicAccessToken } = require("./orderAccess.service");
        const { sendOrderConfirmation } = require("./orderEmail.service");
        const accessToken = assignNewPublicAccessToken(order);
        await order.save();
        await order.populate({
          path: "event",
          populate: [{ path: "production" }, { path: "venue" }],
        });
        await order.populate({
          path: "items",
          populate: [{ path: "seat" }, { path: "priceCategory" }],
        });
        await sendOrderConfirmation(order, accessToken);
      } catch (error) {
        console.error(`Expiry email failed for ${order.orderCode}:`, error.message);
      }
    }
  }
  return expiredCount;
};

module.exports = {
  ALLOWED_TRANSITIONS,
  assertTransitionAllowed,
  expireOrderIfNeeded,
  getOrderExpiry,
  isOrderExpired,
  processExpiredOrders,
  transitionOrder,
};
