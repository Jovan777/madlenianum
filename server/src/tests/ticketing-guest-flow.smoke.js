require("dotenv").config();

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");

const Event = require("../models/Event");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const SeatLock = require("../models/SeatLock");

const PORT = 5102;
const API = `http://localhost:${PORT}/api`;
const TEST_SESSION = `test-guest-flow-${Date.now()}`;
const cleanupOrderIds = [];
let serverProcess;

const waitForServer = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${API}/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Guest ticketing test server did not start.");
};

const request = async (path, { method = "GET", body } = {}) => {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
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
  await SeatLock.deleteMany({ sessionId: { $regex: `^${TEST_SESSION}` } });
};

const lockAndCreate = async ({ eventId, seatId, action, suffix }) => {
  const sessionId = `${TEST_SESSION}-${suffix}`;
  const lock = await request(`/public/events/${eventId}/seats/lock`, {
    method: "POST",
    body: { sessionId, seatIds: [seatId] },
  });
  assert.equal(lock.response.status, 200, JSON.stringify(lock.payload));

  const result = await request("/public/orders", {
    method: "POST",
    body: {
      eventId,
      seatIds: [seatId],
      action,
      sessionId,
      customerSnapshot: {
        firstName: "Test",
        lastName: suffix,
        email: `${suffix.toLowerCase()}@example.com`,
        phone: "+381601234567",
        address: "Ovo polje ne sme biti sačuvano",
        postalCode: "11000",
        city: "Beograd",
        country: "Srbija",
      },
    },
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.payload));
  cleanupOrderIds.push(result.payload.order._id);
  return result.payload;
};

const run = async () => {
  assert.ok(process.env.MONGO_URI, "MONGO_URI is required.");

  serverProcess = spawn(process.execPath, ["src/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverErrors = "";
  serverProcess.stderr.on("data", (chunk) => { serverErrors += chunk.toString(); });
  await waitForServer();
  await mongoose.connect(process.env.MONGO_URI);

  const event = await Event.findOne({
    status: "scheduled",
    saleStatus: "on_sale",
    "ticketing.enabled": true,
    "ticketing.provider": "internal",
    startsAt: { $gt: new Date() },
  }).sort("startsAt");
  assert.ok(event, "A future internal on-sale Event is required.");

  const publicSeats = await request(`/public/events/${event._id}/seats`);
  assert.equal(publicSeats.response.status, 200, JSON.stringify(publicSeats.payload));
  const available = publicSeats.payload.seats
    .filter((seat) => seat.availabilityStatus === "available" && seat.isSellable !== false)
    .slice(0, 2);
  assert.equal(available.length, 2, "Two available seats are required.");

  const reservation = await lockAndCreate({
    eventId: event._id,
    seatId: available[0].id,
    action: "reserve",
    suffix: "Reservation",
  });
  assert.equal(reservation.action, "reserve");
  assert.equal(reservation.order.status, "reserved");
  assert.equal(reservation.order.items[0].status, "reserved");
  assert.equal(reservation.order.customerSnapshot.firstName, "Test");
  assert.equal(reservation.order.customerSnapshot.lastName, "Reservation");
  assert.ok(!("address" in reservation.order.customerSnapshot));
  assert.ok(!("postalCode" in reservation.order.customerSnapshot));

  const purchase = await lockAndCreate({
    eventId: event._id,
    seatId: available[1].id,
    action: "purchase",
    suffix: "Purchase",
  });
  assert.equal(purchase.action, "purchase");
  assert.equal(purchase.order.status, "paid");
  assert.equal(purchase.order.paymentStatus, "paid");
  assert.equal(purchase.order.items[0].status, "paid");

  const updatedSeats = await request(`/public/events/${event._id}/seats`);
  const byId = new Map(updatedSeats.payload.seats.map((seat) => [String(seat.id), seat]));
  assert.equal(byId.get(String(available[0].id)).availabilityStatus, "reserved");
  assert.equal(byId.get(String(available[1].id)).availabilityStatus, "sold");

  await cleanup();
  cleanupOrderIds.length = 0;
  console.log("Guest reservation/purchase smoke tests passed (reserved, sold, minimal snapshot).");
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
