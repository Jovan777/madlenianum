require("dotenv").config();

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");

const Event = require("../models/Event");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
require("../models/PriceCategory");
require("../models/Production");
require("../models/Seat");
const SeatLock = require("../models/SeatLock");
require("../models/Venue");
const { assignNewPublicAccessToken } = require("../services/orderAccess.service");
const { sendOrderConfirmation } = require("../services/orderEmail.service");

const PORT = 5103;
const API = `http://localhost:${PORT}/api`;
const PREFIX = `phase5-${Date.now()}`;
const cleanupOrderIds = [];
let serverProcess;

const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${API}/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Phase 5 test server did not start.");
};

const request = async (path, { method = "GET", token, body } = {}) => {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

const cleanup = async () => {
  if (cleanupOrderIds.length) {
    await OrderItem.deleteMany({ order: { $in: cleanupOrderIds } });
    await Order.deleteMany({ _id: { $in: cleanupOrderIds } });
  }
  await SeatLock.deleteMany({ sessionId: { $regex: `^${PREFIX}` } });
};

const lock = async (eventId, seatIds, suffix) => {
  const sessionId = `${PREFIX}-${suffix}`;
  const checkoutKey = `${sessionId}-checkout`;
  const result = await request(`/public/events/${eventId}/seats/lock`, {
    method: "POST",
    body: { sessionId, checkoutKey, seatIds },
  });
  return { ...result, sessionId, checkoutKey };
};

const createOrder = async ({
  eventId,
  seatIds,
  action,
  sessionId,
  checkoutKey,
  suffix,
}) => request("/public/orders", {
  method: "POST",
  body: {
    eventId,
    seatIds,
    action,
    sessionId,
    checkoutKey,
    idempotencyKey: checkoutKey,
    clientPrice: 1,
    customerSnapshot: {
      firstName: "Phase",
      lastName: suffix,
      email: `${PREFIX}-${suffix}@example.com`,
      phone: "",
      address: "Ne sme biti sacuvano",
      postalCode: "11000",
    },
  },
});

const rememberOrder = async (reference) => {
  const order = await Order.findOne({ orderCode: reference });
  assert.ok(order, `Order ${reference} must exist.`);
  cleanupOrderIds.push(order._id);
  return order;
};

const run = async () => {
  assert.ok(process.env.MONGO_URI, "MONGO_URI is required.");
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Admin credentials are required.");

  serverProcess = spawn(process.execPath, ["src/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      EMAIL_TRANSPORT: "json",
      RESERVATION_DURATION_MINUTES: "60",
      PAYMENT_HOLD_MINUTES: "60",
      ORDER_RESEND_COOLDOWN_SECONDS: "60",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverErrors = "";
  serverProcess.stderr.on("data", (chunk) => { serverErrors += chunk.toString(); });
  await waitForServer();
  await mongoose.connect(process.env.MONGO_URI);

  const login = await request("/admin/auth/login", {
    method: "POST",
    body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  assert.equal(login.response.status, 200, JSON.stringify(login.payload));
  const adminToken = login.payload.token;

  const event = await Event.findOne({
    status: "scheduled",
    saleStatus: "on_sale",
    "ticketing.enabled": true,
    "ticketing.provider": "internal",
    startsAt: { $gt: new Date() },
  }).sort("startsAt");
  assert.ok(event, "A future internal on-sale Event is required.");

  const initialSeats = await request(`/public/events/${event._id}/seats`);
  assert.equal(initialSeats.response.status, 200, JSON.stringify(initialSeats.payload));
  const available = initialSeats.payload.seats
    .filter((seat) => seat.availabilityStatus === "available" && seat.isSellable !== false)
    .slice(0, Math.max(8, Number(event.maxTicketsPerOrder || 4) + 1));
  assert.ok(available.length >= 7, "At least seven available seats are required.");

  const ownerLock = await lock(event._id, [available[0].id], "atomic-owner");
  assert.equal(ownerLock.response.status, 200, JSON.stringify(ownerLock.payload));
  const conflicting = await lock(
    event._id,
    [available[0].id, available[1].id],
    "atomic-foreign"
  );
  assert.equal(conflicting.response.status, 409);
  assert.equal(
    await SeatLock.countDocuments({
      event: event._id,
      seat: available[1].id,
      sessionId: conflicting.sessionId,
      status: "active",
    }),
    0,
    "A failed multi-seat lock must not leave a partial lock."
  );
  await SeatLock.deleteMany({ sessionId: { $in: [ownerLock.sessionId, conflicting.sessionId] } });

  const tooManyIds = available
    .slice(0, Number(event.maxTicketsPerOrder || 4) + 1)
    .map((seat) => seat.id);
  const tooMany = await lock(event._id, tooManyIds, "too-many");
  assert.equal(tooMany.response.status, 400);

  const reservationLock = await lock(event._id, [available[1].id], "reservation");
  assert.equal(reservationLock.response.status, 200, JSON.stringify(reservationLock.payload));
  const restored = await request(
    `/public/events/${event._id}/seats/locks/current?sessionId=${encodeURIComponent(reservationLock.sessionId)}`
  );
  assert.equal(restored.response.status, 200);
  assert.equal(restored.payload.restored, true);
  assert.equal(restored.payload.seats.length, 1);

  const reservationResult = await createOrder({
    eventId: event._id,
    seatIds: [available[1].id],
    action: "reserve",
    sessionId: reservationLock.sessionId,
    checkoutKey: reservationLock.checkoutKey,
    suffix: "reservation",
  });
  assert.equal(reservationResult.response.status, 201, JSON.stringify(reservationResult.payload));
  assert.equal(reservationResult.payload.order.status, "reserved");
  assert.equal(reservationResult.payload.order.paymentStatus, "unpaid");
  assert.equal(reservationResult.payload.order.customer.phone, "");
  assert.ok(!("address" in reservationResult.payload.order.customer));
  assert.equal(reservationResult.payload.emailStatus, "sent");
  const reservationOrder = await rememberOrder(reservationResult.payload.order.reference);
  const reservationItems = await OrderItem.find({ order: reservationOrder._id });
  assert.equal(reservationItems[0].status, "reserved");
  assert.notEqual(reservationItems[0].finalPrice, 1, "Client price must be ignored.");
  assert.ok(reservationItems[0].productionTitle);

  const duplicateResult = await createOrder({
    eventId: event._id,
    seatIds: [available[1].id],
    action: "reserve",
    sessionId: reservationLock.sessionId,
    checkoutKey: reservationLock.checkoutKey,
    suffix: "reservation",
  });
  assert.equal(duplicateResult.response.status, 200);
  assert.equal(duplicateResult.payload.idempotent, true);
  assert.equal(duplicateResult.payload.order.reference, reservationOrder.orderCode);
  assert.equal(
    await Order.countDocuments({ idempotencyKey: reservationLock.checkoutKey }),
    1
  );

  const invalidPublicView = await request(
    `/public/orders/${reservationOrder.orderCode}?token=invalid`
  );
  assert.equal(invalidPublicView.response.status, 403);
  const secureView = await request(
    `/public/orders/${reservationOrder.orderCode}?token=${encodeURIComponent(reservationResult.payload.accessToken)}`
  );
  assert.equal(secureView.response.status, 200);
  assert.ok(!("notes" in secureView.payload.order));
  assert.ok(!("emailDelivery" in secureView.payload.order));
  assert.ok(!("_id" in secureView.payload.order));

  const expiredLock = await lock(event._id, [available[2].id], "expired-lock");
  assert.equal(expiredLock.response.status, 200);
  await SeatLock.updateMany(
    { sessionId: expiredLock.sessionId, checkoutKey: expiredLock.checkoutKey },
    { $set: { expiresAt: new Date(Date.now() - 1000) } }
  );
  const expiredLockOrder = await createOrder({
    eventId: event._id,
    seatIds: [available[2].id],
    action: "reserve",
    sessionId: expiredLock.sessionId,
    checkoutKey: expiredLock.checkoutKey,
    suffix: "expired-lock",
  });
  assert.equal(expiredLockOrder.response.status, 409);

  const purchaseLock = await lock(event._id, [available[3].id], "purchase");
  const purchaseResult = await createOrder({
    eventId: event._id,
    seatIds: [available[3].id],
    action: "purchase",
    sessionId: purchaseLock.sessionId,
    checkoutKey: purchaseLock.checkoutKey,
    suffix: "purchase",
  });
  assert.equal(purchaseResult.response.status, 201, JSON.stringify(purchaseResult.payload));
  assert.equal(purchaseResult.payload.order.status, "pending_payment");
  assert.equal(purchaseResult.payload.order.paymentStatus, "pending");
  const purchaseOrder = await rememberOrder(purchaseResult.payload.order.reference);
  assert.equal((await OrderItem.findOne({ order: purchaseOrder._id })).status, "pending_payment");

  const seatsWithPending = await request(`/public/events/${event._id}/seats`);
  const pendingSeat = seatsWithPending.payload.seats.find(
    (seat) => String(seat.id) === String(available[3].id)
  );
  assert.equal(pendingSeat.availabilityStatus, "reserved");

  const eventOverview = await request("/admin/orders/overview?time=all", {
    token: adminToken,
  });
  assert.equal(eventOverview.response.status, 200, JSON.stringify(eventOverview.payload));
  const overviewItem = eventOverview.payload.items.find(
    (item) => item.event.id === String(event._id)
  );
  assert.ok(overviewItem);
  assert.ok(overviewItem.stats.reservedOrders >= 1);
  assert.ok(overviewItem.stats.pendingPaymentOrders >= 1);

  const filtered = await request(
    `/admin/orders?event=${event._id}&tab=pending-payment&limit=1`,
    { token: adminToken }
  );
  assert.equal(filtered.response.status, 200);
  assert.equal(filtered.payload.pagination.limit, 1);
  assert.ok(filtered.payload.items.every((order) => order.status === "pending_payment"));

  const markPaid = await request(`/admin/orders/${purchaseOrder._id}/mark-paid`, {
    method: "POST",
    token: adminToken,
    body: { reason: "Phase 5 test payment." },
  });
  assert.equal(markPaid.response.status, 200, JSON.stringify(markPaid.payload));
  assert.equal(markPaid.payload.item.status, "paid");
  assert.equal(markPaid.payload.item.paymentStatus, "paid");
  assert.ok(markPaid.payload.item.statusHistory.some((entry) => entry.toStatus === "paid"));

  const soldSeats = await request(`/public/events/${event._id}/seats`);
  assert.equal(
    soldSeats.payload.seats.find(
      (seat) => String(seat.id) === String(available[3].id)
    ).availabilityStatus,
    "sold"
  );
  const invalidPaidCancel = await request(`/admin/orders/${purchaseOrder._id}/cancel`, {
    method: "POST",
    token: adminToken,
    body: { reason: "Must fail." },
  });
  assert.equal(invalidPaidCancel.response.status, 409);

  const cancelLock = await lock(event._id, [available[4].id], "cancel");
  const cancelCreated = await createOrder({
    eventId: event._id,
    seatIds: [available[4].id],
    action: "reserve",
    sessionId: cancelLock.sessionId,
    checkoutKey: cancelLock.checkoutKey,
    suffix: "cancel",
  });
  const cancelOrder = await rememberOrder(cancelCreated.payload.order.reference);
  const cancelled = await request(`/admin/orders/${cancelOrder._id}/cancel`, {
    method: "POST",
    token: adminToken,
    body: { reason: "Phase 5 cancellation test." },
  });
  assert.equal(cancelled.response.status, 200, JSON.stringify(cancelled.payload));
  assert.equal(cancelled.payload.item.status, "cancelled");
  const afterCancel = await request(`/public/events/${event._id}/seats`);
  assert.equal(
    afterCancel.payload.seats.find(
      (seat) => String(seat.id) === String(available[4].id)
    ).availabilityStatus,
    "available"
  );

  await Order.updateOne(
    { _id: reservationOrder._id },
    {
      $set: {
        reservationExpiresAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() - 1000),
      },
    }
  );
  await request(`/public/events/${event._id}/seats`);
  assert.equal((await Order.findById(reservationOrder._id)).status, "expired");
  const afterExpiry = await request(`/public/events/${event._id}/seats`);
  assert.equal(
    afterExpiry.payload.seats.find(
      (seat) => String(seat.id) === String(available[1].id)
    ).availabilityStatus,
    "available"
  );

  const emailFailureOrder = await Order.findById(cancelOrder._id)
    .populate({ path: "event", populate: [{ path: "production" }, { path: "venue" }] })
    .populate("items");
  const savedBeforeFailure = await Order.countDocuments({ _id: emailFailureOrder._id });
  const previousTransport = process.env.EMAIL_TRANSPORT;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.EMAIL_TRANSPORT = "";
  process.env.NODE_ENV = "development";
  const failureToken = assignNewPublicAccessToken(emailFailureOrder);
  await emailFailureOrder.save();
  const failedDelivery = await sendOrderConfirmation(emailFailureOrder, failureToken);
  assert.equal(failedDelivery.sent, false);
  assert.equal(await Order.countDocuments({ _id: emailFailureOrder._id }), savedBeforeFailure);
  process.env.EMAIL_TRANSPORT = previousTransport;
  process.env.NODE_ENV = previousNodeEnv;

  const resend = await request(`/admin/orders/${cancelOrder._id}/resend-confirmation`, {
    method: "POST",
    token: adminToken,
  });
  assert.equal(resend.response.status, 200, JSON.stringify(resend.payload));
  const rapidResend = await request(`/admin/orders/${cancelOrder._id}/resend-confirmation`, {
    method: "POST",
    token: adminToken,
  });
  assert.equal(rapidResend.response.status, 429);

  const paidRevenueOverview = await request("/admin/orders/overview?time=all", {
    token: adminToken,
  });
  const finalOverview = paidRevenueOverview.payload.items.find(
    (item) => item.event.id === String(event._id)
  );
  const paidRevenue = await Order.aggregate([
    { $match: { event: event._id, status: "paid" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  assert.equal(finalOverview.stats.paidRevenue, paidRevenue[0]?.total || 0);

  await cleanup();
  cleanupOrderIds.length = 0;
  console.log("Phase 5 guest order, email, expiry and admin smoke tests passed.");
  if (serverErrors) console.log(serverErrors.trim());
};

run()
  .then(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (serverProcess) serverProcess.kill();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    if (mongoose.connection.readyState) await cleanup();
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  });
