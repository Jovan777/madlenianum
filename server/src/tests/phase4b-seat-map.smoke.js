require("dotenv").config();

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");

const Event = require("../models/Event");
const EventSeatOverride = require("../models/EventSeatOverride");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Seat = require("../models/Seat");
const SeatLock = require("../models/SeatLock");
const SeatMap = require("../models/SeatMap");
const Venue = require("../models/Venue");

const PORT = 5101;
const API = `http://localhost:${PORT}/api`;
const TEST_REASON = `[test:phase4b:${Date.now()}]`;
let serverProcess;
let duplicateMapId;
let coordinateSeatId;
let originalCoordinates;
const cleanupOrderIds = [];
const cleanupLockIds = [];

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
  throw new Error("Phase 4B test server did not start.");
};

const request = async (path, { method = "GET", token, body } = {}) => {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

const cleanup = async () => {
  await EventSeatOverride.deleteMany({ internalReason: TEST_REASON });
  if (cleanupLockIds.length) await SeatLock.deleteMany({ _id: { $in: cleanupLockIds } });
  if (cleanupOrderIds.length) {
    await OrderItem.deleteMany({ order: { $in: cleanupOrderIds } });
    await Order.deleteMany({ _id: { $in: cleanupOrderIds } });
  }
  if (coordinateSeatId && originalCoordinates) {
    await Seat.updateOne(
      { _id: coordinateSeatId },
      { $set: originalCoordinates }
    );
  }
  if (duplicateMapId) {
    await Seat.deleteMany({ seatMap: duplicateMapId });
    await SeatMap.deleteOne({ _id: duplicateMapId });
  }
};

const run = async () => {
  assert.ok(process.env.MONGO_URI, "MONGO_URI is required.");
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Admin credentials are required.");

  serverProcess = spawn(process.execPath, ["src/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "test" },
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
  const token = login.payload.token;

  const event = await Event.findOne({
    status: "scheduled",
    saleStatus: "on_sale",
    "ticketing.enabled": true,
    "ticketing.provider": "internal",
    startsAt: { $gt: new Date() },
  }).sort("startsAt");
  assert.ok(event?.seatMap, "A future internal Event with SeatMap is required.");
  const seatMap = await SeatMap.findById(event.seatMap);
  assert.ok(seatMap, "Seeded SeatMap is required.");
  const initialSeats = await Seat.find({ seatMap: seatMap._id }).sort("sortOrder");
  assert.equal(initialSeats.length, 504, "Existing SeatMap must load all 504 seats.");

  const basePreview = await request(`/admin/seat-maps/${seatMap._id}/preview`, { token });
  assert.equal(basePreview.response.status, 200, JSON.stringify(basePreview.payload));
  assert.equal(basePreview.payload.item.seats.length, 504);
  assert.ok(
    !basePreview.payload.item.warnings.some((warning) =>
      ["outside_canvas", "outside_coordinate_space"].includes(warning.code)
    ),
    "Valid seeded seats must not be reported outside the canonical coordinate space."
  );

  const coordinateSeat = initialSeats[20];
  coordinateSeatId = coordinateSeat._id;
  originalCoordinates = { x: coordinateSeat.x, y: coordinateSeat.y };
  const coordinateSave = await request(`/admin/seat-maps/${seatMap._id}/seats/bulk`, {
    method: "PATCH",
    token,
    body: {
      seatIds: [String(coordinateSeat._id)],
      updates: [{
        seatId: String(coordinateSeat._id),
        changes: { x: coordinateSeat.x + 5, y: coordinateSeat.y + 5 },
      }],
    },
  });
  assert.equal(coordinateSave.response.status, 200, JSON.stringify(coordinateSave.payload));
  assert.equal(String(coordinateSave.payload.items[0]._id), String(coordinateSeat._id));
  assert.equal(coordinateSave.payload.items[0].x, coordinateSeat.x + 5);

  const bulkEditSeats = initialSeats.slice(30, 33);
  const bulkEdit = await request(`/admin/seat-maps/${seatMap._id}/seats/bulk`, {
    method: "PATCH",
    token,
    body: {
      seatIds: bulkEditSeats.map((seat) => String(seat._id)),
      changes: { physicalNote: TEST_REASON, hasRestrictedView: true },
    },
  });
  assert.equal(bulkEdit.response.status, 200);
  assert.equal(bulkEdit.payload.count, 3);
  await Seat.updateMany(
    { _id: { $in: bulkEditSeats.map((seat) => seat._id) } },
    { $set: { physicalNote: "", hasRestrictedView: false } }
  );

  const protectedMapDelete = await request(`/admin/seat-maps/${seatMap._id}`, {
    method: "DELETE",
    token,
  });
  assert.equal(protectedMapDelete.response.status, 409);
  assert.ok(protectedMapDelete.payload.details.usage.events > 0);

  const protectedSeatDelete = await request(`/admin/seats/${initialSeats[0]._id}`, {
    method: "DELETE",
    token,
  });
  assert.equal(protectedSeatDelete.response.status, 409);

  const duplicated = await request(`/admin/seat-maps/${seatMap._id}/duplicate`, {
    method: "POST",
    token,
    body: { name: `Phase 4B test map ${Date.now()}` },
  });
  assert.equal(duplicated.response.status, 201, JSON.stringify(duplicated.payload));
  duplicateMapId = duplicated.payload.item._id;
  const duplicateSeats = await Seat.find({ seatMap: duplicateMapId }).sort("sortOrder");
  assert.equal(duplicateSeats.length, initialSeats.length);
  assert.notEqual(String(duplicateSeats[0]._id), String(initialSeats[0]._id));

  const sameRow = duplicateSeats.filter((seat) =>
    seat.section === duplicateSeats[0].section && seat.row === duplicateSeats[0].row
  ).slice(0, 2);
  assert.equal(sameRow.length, 2);
  const duplicateIdentity = await request(`/admin/seat-maps/${duplicateMapId}/seats/bulk`, {
    method: "PATCH",
    token,
    body: {
      seatIds: [String(sameRow[1]._id)],
      changes: { number: sameRow[0].number },
    },
  });
  assert.equal(duplicateIdentity.response.status, 400);
  assert.ok(duplicateIdentity.payload.details.fields.some((item) =>
    item.code === "duplicate_seat_identity"
  ));

  const otherVenue = await Venue.findOne({ _id: { $ne: seatMap.venue } });
  assert.ok(otherVenue);
  const venueMismatch = await request("/admin/seats", {
    method: "POST",
    token,
    body: {
      seatMap: duplicateMapId,
      venue: otherVenue._id,
      section: "Test",
      row: "T",
      number: 1,
      label: `Test-${Date.now()}`,
      x: 100,
      y: 100,
    },
  });
  assert.equal(venueMismatch.response.status, 400);

  const eventPreview = await request(`/admin/events/${event._id}/seat-map-preview`, { token });
  assert.equal(eventPreview.response.status, 200, JSON.stringify(eventPreview.payload));
  assert.equal(eventPreview.payload.item.seats.length, 504);
  const availableSeats = eventPreview.payload.item.seats
    .filter((seat) => seat.availabilityStatus === "available")
    .slice(0, 5);
  assert.ok(availableSeats.length >= 5);
  const overrideSeatIds = availableSeats.slice(0, 2).map((seat) => String(seat.id));

  const confirmationRequired = await request(`/admin/events/${event._id}/seat-overrides/bulk`, {
    method: "POST",
    token,
    body: {
      seatIds: overrideSeatIds,
      type: "protocol",
      internalReason: TEST_REASON,
    },
  });
  assert.equal(confirmationRequired.response.status, 409);
  assert.equal(confirmationRequired.payload.details.code, "active_sale_confirmation_required");

  const bulkOverride = await request(`/admin/events/${event._id}/seat-overrides/bulk`, {
    method: "POST",
    token,
    body: {
      seatIds: overrideSeatIds,
      type: "protocol",
      internalReason: TEST_REASON,
      confirmActiveSale: true,
    },
  });
  assert.equal(bulkOverride.response.status, 200, JSON.stringify(bulkOverride.payload));
  assert.equal(bulkOverride.payload.count, 2);

  const duplicateRequest = await request(`/admin/events/${event._id}/seat-overrides/bulk`, {
    method: "POST",
    token,
    body: {
      seatIds: [overrideSeatIds[0], overrideSeatIds[0]],
      type: "vip",
      internalReason: TEST_REASON,
      confirmActiveSale: true,
    },
  });
  assert.equal(duplicateRequest.response.status, 400);

  const wrongMapSeat = await request(`/admin/events/${event._id}/seat-overrides/bulk`, {
    method: "POST",
    token,
    body: {
      seatIds: [String(duplicateSeats[0]._id)],
      type: "vip",
      internalReason: TEST_REASON,
      confirmActiveSale: true,
    },
  });
  assert.equal(wrongMapSeat.response.status, 400);

  const repeatedOverride = await request(`/admin/events/${event._id}/seat-overrides/bulk`, {
    method: "POST",
    token,
    body: {
      seatIds: [overrideSeatIds[0]],
      type: "protocol",
      internalReason: TEST_REASON,
      confirmActiveSale: true,
    },
  });
  assert.equal(repeatedOverride.response.status, 200);
  assert.equal(await EventSeatOverride.countDocuments({
    event: event._id,
    seat: overrideSeatIds[0],
  }), 1);

  const boxOfficeSeatId = String(availableSeats[2].id);
  const tempUnavailableSeatId = String(availableSeats[3].id);
  for (const [seatId, type] of [
    [boxOfficeSeatId, "box_office_only"],
    [tempUnavailableSeatId, "temporarily_unavailable"],
  ]) {
    const result = await request(`/admin/events/${event._id}/seat-overrides/bulk`, {
      method: "POST",
      token,
      body: {
        seatIds: [seatId],
        type,
        internalReason: TEST_REASON,
        publicMessage: type === "box_office_only" ? "Dostupno na blagajni." : "",
        confirmActiveSale: true,
      },
    });
    assert.equal(result.response.status, 200);
  }

  let publicSeats = await request(`/public/events/${event._id}/seats`);
  assert.equal(publicSeats.response.status, 200);
  const publicById = new Map(publicSeats.payload.seats.map((seat) => [String(seat.id), seat]));
  const adminById = new Map(eventPreview.payload.item.seats.map((seat) => [String(seat.id), seat]));
  publicSeats.payload.seats.slice(0, 40).forEach((publicSeat) => {
    const adminSeat = adminById.get(String(publicSeat.id));
    assert.ok(adminSeat, `Admin preview is missing seat ${publicSeat.id}.`);
    assert.deepEqual(
      {
        section: adminSeat.section,
        row: adminSeat.row,
        number: adminSeat.number,
        x: adminSeat.x,
        y: adminSeat.y,
        width: adminSeat.width,
        height: adminSeat.height,
        rotation: adminSeat.rotation,
      },
      {
        section: publicSeat.section,
        row: publicSeat.row,
        number: publicSeat.number,
        x: publicSeat.x,
        y: publicSeat.y,
        width: publicSeat.width,
        height: publicSeat.height,
        rotation: publicSeat.rotation,
      },
      `Admin and public physical layout differ for seat ${publicSeat.id}.`
    );
  });
  overrideSeatIds.forEach((seatId) => {
    assert.equal(publicById.get(seatId).availabilityStatus, "unavailable");
  });
  assert.equal(publicById.get(boxOfficeSeatId).availabilityStatus, "box_office_only");
  assert.equal(publicById.get(tempUnavailableSeatId).availabilityStatus, "unavailable");
  assert.ok(!JSON.stringify(publicById.get(overrideSeatIds[0])).includes(TEST_REASON));
  assert.ok(!("override" in publicById.get(overrideSeatIds[0])));

  const cancelledSeat = availableSeats[4];
  const cancelledOrder = await Order.create({
    event: event._id,
    customerSnapshot: { fullName: "Phase 4B test", email: "phase4b@example.com" },
    sessionId: TEST_REASON,
    status: "cancelled",
    paymentStatus: "cancelled",
    totalAmount: 100,
  });
  cleanupOrderIds.push(cancelledOrder._id);
  await OrderItem.create({
    order: cancelledOrder._id,
    event: event._id,
    seat: cancelledSeat.id,
    seatLabel: cancelledSeat.label,
    section: cancelledSeat.section,
    row: cancelledSeat.row,
    number: cancelledSeat.number,
    unitPrice: 100,
    finalPrice: 100,
    status: "cancelled",
  });
  publicSeats = await request(`/public/events/${event._id}/seats`);
  assert.equal(
    publicSeats.payload.seats.find((seat) => String(seat.id) === String(cancelledSeat.id)).availabilityStatus,
    "available"
  );

  const expiredLock = await SeatLock.create({
    event: event._id,
    seat: cancelledSeat.id,
    sessionId: TEST_REASON,
    expiresAt: new Date(Date.now() - 60_000),
    status: "active",
  });
  cleanupLockIds.push(expiredLock._id);
  publicSeats = await request(`/public/events/${event._id}/seats`);
  assert.equal(
    publicSeats.payload.seats.find((seat) => String(seat.id) === String(cancelledSeat.id)).availabilityStatus,
    "available"
  );
  await SeatLock.updateOne(
    { _id: expiredLock._id },
    { $set: { expiresAt: new Date(Date.now() + 60_000), status: "active" } }
  );
  publicSeats = await request(`/public/events/${event._id}/seats`);
  assert.equal(
    publicSeats.payload.seats.find((seat) => String(seat.id) === String(cancelledSeat.id)).availabilityStatus,
    "locked"
  );

  const paidOrder = await Order.findOne({ status: "paid" });
  const paidItem = paidOrder ? await OrderItem.findOne({ order: paidOrder._id, status: "paid" }) : null;
  assert.ok(paidOrder && paidItem);
  const paidEvent = await Event.findById(paidItem.event);
  assert.ok(paidEvent?.startsAt > new Date());
  await EventSeatOverride.findOneAndUpdate(
    { event: paidItem.event, seat: paidItem.seat },
    {
      event: paidItem.event,
      seatMap: paidEvent.seatMap,
      seat: paidItem.seat,
      type: "protocol",
      internalReason: TEST_REASON,
      active: true,
    },
    { upsert: true, returnDocument: "after" }
  );
  const paidPublicSeats = await request(`/public/events/${paidItem.event}/seats`);
  assert.equal(paidPublicSeats.response.status, 200);
  assert.equal(
    paidPublicSeats.payload.seats.find((seat) => String(seat.id) === String(paidItem.seat)).availabilityStatus,
    "sold"
  );

  const removeOverrides = await request(`/admin/events/${event._id}/seat-overrides/bulk`, {
    method: "DELETE",
    token,
    body: {
      seatIds: [...overrideSeatIds, boxOfficeSeatId, tempUnavailableSeatId],
      confirmActiveSale: true,
    },
  });
  assert.equal(removeOverrides.response.status, 200);
  assert.ok(removeOverrides.payload.removedCount >= 4);

  const list = await request(`/admin/events/${event._id}/seat-overrides`, { token });
  assert.equal(list.response.status, 200);
  assert.ok(list.payload.item.summary.active >= 0);

  const system = await request("/admin/system/status", { token });
  assert.equal(system.response.status, 200);
  assert.ok(Number.isInteger(system.payload.counts.eventSeatOverrides));

  await cleanup();
  duplicateMapId = null;
  coordinateSeatId = null;
  cleanupOrderIds.length = 0;
  cleanupLockIds.length = 0;
  console.log("Phase 4B SeatMap/override smoke tests passed (34 scenarios).");
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
