require("dotenv").config();

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");

const Event = require("../models/Event");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
require("../models/Production");
require("../models/Venue");
require("../models/Seat");
require("../models/PriceCategory");
const SeatLock = require("../models/SeatLock");
const { processExpiredOrders, transitionOrder } = require("../services/orderLifecycle.service");
const { sanitizeRichText } = require("../services/richText.service");
const { validateUploadedFileContent } = require("../services/mediaFileValidation.service");

const PORT = 5107;
const API = `http://localhost:${PORT}/api`;
const PREFIX = `phase7-${Date.now()}`;
const orderIds = [];
let serverProcess;

const request = async (route, { method = "GET", body, headers = {} } = {}) => {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, payload: await response.json().catch(() => ({})) };
};

const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${API}/health`);
      if (response.ok) return;
    } catch {
      // The child process is still connecting to MongoDB.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Phase 7 test server did not start.");
};

const cleanup = async () => {
  if (orderIds.length) {
    await OrderItem.deleteMany({ order: { $in: orderIds } });
    await Order.deleteMany({ _id: { $in: orderIds } });
  }
  await SeatLock.deleteMany({ sessionId: { $regex: `^${PREFIX}` } });
};

const createFromLock = async ({ eventId, seatId, sessionId, checkoutKey, action }) => request("/public/orders", {
  method: "POST",
  body: {
    eventId,
    seatIds: [seatId],
    action,
    sessionId,
    checkoutKey,
    idempotencyKey: checkoutKey,
    total: 1,
    prices: [{ seatId, amount: 1 }],
    customerSnapshot: {
      firstName: "Phase",
      lastName: "Seven",
      email: `${PREFIX}@example.com`,
      phone: "",
    },
  },
});

const run = async () => {
  assert.ok(process.env.MONGO_URI, "MONGO_URI is required.");
  serverProcess = spawn(process.execPath, ["src/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      EMAIL_TRANSPORT: "json",
      RATE_LIMIT_SEAT_LOCK_MAX: "100",
      RATE_LIMIT_LOOKUP_MAX: "2",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverErrors = "";
  serverProcess.stderr.on("data", (chunk) => { serverErrors += chunk.toString(); });
  await waitForServer();
  await mongoose.connect(process.env.MONGO_URI);

  const health = await request("/health");
  const ready = await request("/ready");
  assert.equal(health.response.status, 200);
  assert.equal(ready.response.status, 200);
  const privateAdminRoute = await request("/admin/audit-logs");
  assert.equal(privateAdminRoute.response.status, 401);
  const removedPublicAccountRoute = await request("/customer/register", { method: "POST", body: {} });
  assert.equal(removedPublicAccountRoute.response.status, 404);
  const rejectedOrigin = await request("/public/home", { headers: { Origin: "https://untrusted.example" } });
  assert.equal(rejectedOrigin.response.status, 403);
  const lookupAttempts = await Promise.all([
    request("/public/orders/lookup", { method: "POST", body: { reference: "missing", email: "phase7@example.com" } }),
    request("/public/orders/lookup", { method: "POST", body: { reference: "missing", email: "phase7@example.com" } }),
  ]);
  const throttledLookup = await request("/public/orders/lookup", {
    method: "POST",
    body: { reference: "missing", email: "phase7@example.com" },
  });
  assert.ok(lookupAttempts.every(({ response }) => response.status !== 429));
  assert.equal(throttledLookup.response.status, 429, "Public order lookup must be rate limited.");

  const event = await Event.findOne({
    status: "scheduled",
    saleStatus: "on_sale",
    "ticketing.enabled": true,
    "ticketing.provider": "internal",
    startsAt: { $gt: new Date() },
  }).sort("startsAt");
  assert.ok(event, "A future internal on-sale Event is required.");

  const initial = await request(`/public/events/${event._id}/seats`);
  assert.equal(initial.response.status, 200, JSON.stringify(initial.payload));
  const available = initial.payload.seats
    .filter((seat) => seat.availabilityStatus === "available" && seat.isSellable !== false)
    .slice(0, 2);
  assert.equal(available.length, 2, "Two available seats are required.");

  const contenders = ["a", "b"].map((suffix) => ({
    sessionId: `${PREFIX}-concurrent-${suffix}`,
    checkoutKey: `${PREFIX}-checkout-${suffix}`,
  }));
  const concurrentResults = await Promise.all(contenders.map((contender) => request(
    `/public/events/${event._id}/seats/lock`,
    { method: "POST", body: { ...contender, seatIds: [available[0].id] } }
  )));
  assert.deepEqual(concurrentResults.map((item) => item.response.status).sort(), [200, 409]);
  const activeConcurrentLocks = await SeatLock.find({
    event: event._id,
    seat: available[0].id,
    sessionId: { $regex: `^${PREFIX}` },
    status: "active",
    expiresAt: { $gt: new Date() },
  });
  assert.equal(activeConcurrentLocks.length, 1, "Exactly one concurrent lock may remain active.");
  const winnerIndex = concurrentResults.findIndex((item) => item.response.status === 200);
  const winner = contenders[winnerIndex];

  const created = await createFromLock({
    eventId: event._id,
    seatId: available[0].id,
    ...winner,
    action: "reserve",
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  const reservedOrder = await Order.findOne({ orderCode: created.payload.order.reference });
  orderIds.push(reservedOrder._id);
  const reservedItem = await OrderItem.findOne({ order: reservedOrder._id });
  assert.notEqual(reservedItem.finalPrice, 1, "A client-supplied price must be ignored.");
  assert.equal(await OrderItem.countDocuments({ event: event._id, seat: available[0].id, status: "reserved" }), 1);

  const duplicate = await createFromLock({
    eventId: event._id,
    seatId: available[0].id,
    ...winner,
    action: "reserve",
  });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.payload.idempotent, true);
  assert.equal(await Order.countDocuments({ idempotencyKey: winner.checkoutKey }), 1);

  reservedOrder.reservationExpiresAt = new Date(Date.now() - 1000);
  reservedOrder.expiresAt = reservedOrder.reservationExpiresAt;
  await reservedOrder.save();
  assert.ok((await processExpiredOrders()) >= 1);
  await processExpiredOrders();
  const expiredOrder = await Order.findById(reservedOrder._id);
  assert.equal(expiredOrder.status, "expired");
  assert.equal(
    expiredOrder.statusHistory.filter((entry) => entry.toStatus === "expired").length,
    1,
    "Repeated expiry processing must not duplicate the transition."
  );

  const paidSession = { sessionId: `${PREFIX}-paid`, checkoutKey: `${PREFIX}-paid-checkout` };
  const paidLock = await request(`/public/events/${event._id}/seats/lock`, {
    method: "POST",
    body: { ...paidSession, seatIds: [available[1].id] },
  });
  assert.equal(paidLock.response.status, 200, JSON.stringify(paidLock.payload));
  const purchase = await createFromLock({ eventId: event._id, seatId: available[1].id, ...paidSession, action: "purchase" });
  assert.equal(purchase.response.status, 201, JSON.stringify(purchase.payload));
  const paidOrder = await Order.findOne({ orderCode: purchase.payload.order.reference });
  orderIds.push(paidOrder._id);
  await transitionOrder(paidOrder, "paid", { source: "system", reason: "Phase 7 paid-seat lifecycle check" });
  await processExpiredOrders();
  assert.equal((await Order.findById(paidOrder._id)).status, "paid");
  const effective = await request(`/public/events/${event._id}/seats`);
  const paidSeat = effective.payload.seats.find((seat) => String(seat.id) === String(available[1].id));
  assert.equal(paidSeat.availabilityStatus, "sold", "A paid seat must remain sold.");

  const sanitized = sanitizeRichText('<p onclick="steal()">Bezbedno <a href="javascript:alert(1)">link</a></p><script>alert(1)</script>');
  assert.ok(!sanitized.includes("onclick"));
  assert.ok(!sanitized.includes("javascript:"));
  assert.ok(!sanitized.includes("<script"));

  const fakePng = path.join(os.tmpdir(), `${PREFIX}.png`);
  await fs.writeFile(fakePng, Buffer.from("this is not a png"));
  await assert.rejects(
    validateUploadedFileContent({ path: fakePng, mimetype: "image/png" }),
    (error) => error.code === "invalid_file_signature"
  );
  await fs.unlink(fakePng);

  await cleanup();
  orderIds.length = 0;
  console.log("Phase 7 readiness tests passed (concurrency, authoritative pricing, expiry, CORS, rate limiting, sanitization, upload signature)." );
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
