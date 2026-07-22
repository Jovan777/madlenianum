require("dotenv").config();

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");

const Event = require("../models/Event");
const Order = require("../models/Order");
const PriceCategory = require("../models/PriceCategory");
const PricePlan = require("../models/PricePlan");
const Production = require("../models/Production");
const SeatLock = require("../models/SeatLock");
const SeatMap = require("../models/SeatMap");
const Venue = require("../models/Venue");

const PORT = 5099;
const API = `http://localhost:${PORT}/api`;
let serverProcess;
let cleanupEventId;
let cleanupPlanId;
let cleanupCategoryId;

const cleanupTemporaryRecords = async () => {
  if (cleanupEventId) await Event.deleteOne({ _id: cleanupEventId });
  if (cleanupPlanId) await PricePlan.deleteOne({ _id: cleanupPlanId });
  if (cleanupCategoryId) await PriceCategory.deleteOne({ _id: cleanupCategoryId });
};

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
  throw new Error("Phase 4A test server did not start.");
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

const expectIssue = async (token, body, code) => {
  const result = await request("/admin/events/validate", { method: "POST", token, body });
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.valid, false);
  assert.ok(result.payload.errors.some((item) => item.code === code), `Expected Event issue ${code}`);
};

const run = async () => {
  assert.ok(process.env.MONGO_URI, "MONGO_URI is required.");
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Admin seed credentials are required.");

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
  assert.equal(login.response.status, 200, `Admin login failed: ${JSON.stringify(login.payload)}`);
  const token = login.payload.token;

  const validEvent = await Event.findOne({
    status: "scheduled",
    saleStatus: "on_sale",
    "ticketing.enabled": true,
    "ticketing.provider": "internal",
    startsAt: { $gt: new Date() },
  });
  assert.ok(validEvent, "A future internal on-sale Event is required from seeds.");
  const production = await Production.findById(validEvent.production);
  const venue = await Venue.findById(validEvent.venue);
  const seatMap = await SeatMap.findById(validEvent.seatMap);
  const plan = await PricePlan.findById(validEvent.pricePlan);
  const otherVenue = await Venue.findOne({ _id: { $ne: venue._id } });
  assert.ok(production && venue && seatMap && plan && otherVenue, "Seeded compatibility fixtures are incomplete.");

  const baseEvent = {
    production: production._id,
    venue: venue._id,
    startsAt: validEvent.startsAt,
    endsAt: validEvent.endsAt,
    isPremiere: validEvent.isPremiere,
    status: "scheduled",
    saleStatus: "on_sale",
    saleStartsAt: validEvent.saleStartsAt,
    saleEndsAt: validEvent.saleEndsAt,
    seatMap: seatMap._id,
    pricePlan: plan._id,
    maxTicketsPerOrder: 4,
    lockDurationMinutes: 15,
    ticketing: { enabled: true, provider: "internal" },
  };

  const validCheck = await request("/admin/events/validate", { method: "POST", token, body: baseEvent });
  assert.equal(validCheck.payload.valid, true, JSON.stringify(validCheck.payload.errors));
  await expectIssue(token, { ...baseEvent, endsAt: new Date(new Date(baseEvent.startsAt).getTime() - 1000) }, "invalid_range");
  await expectIssue(token, { ...baseEvent, saleStartsAt: baseEvent.saleEndsAt, saleEndsAt: baseEvent.saleStartsAt }, "invalid_range");
  await expectIssue(token, { ...baseEvent, venue: otherVenue._id }, "venue_mismatch");

  const mismatchedPlan = await PricePlan.findOne({
    venue: venue._id,
    productionTypes: { $nin: [production.type] },
    isPremiere: Boolean(validEvent.isPremiere),
  });
  if (mismatchedPlan) await expectIssue(token, { ...baseEvent, pricePlan: mismatchedPlan._id }, "unsupported_production_type");
  await expectIssue(token, { ...baseEvent, isPremiere: !validEvent.isPremiere }, "premiere_mismatch");
  await expectIssue(token, { ...baseEvent, seatMap: null }, "required_for_internal");
  await expectIssue(token, { ...baseEvent, pricePlan: null }, "required_for_internal");
  await expectIssue(token, { ...baseEvent, seatMap: null, pricePlan: null, ticketing: { enabled: true, provider: "legacy_php", legacyEventId: "" } }, "required_for_legacy");
  await expectIssue(token, { ...baseEvent, seatMap: null, pricePlan: null, ticketing: { enabled: true, provider: "external", externalCheckoutUrl: "ftp://invalid" } }, "invalid_url");

  const duplicatedEvent = await request(`/admin/events/${validEvent._id}/duplicate`, { method: "POST", token, body: {} });
  assert.equal(duplicatedEvent.response.status, 201);
  assert.equal(duplicatedEvent.payload.item.status, "draft");
  assert.equal(duplicatedEvent.payload.item.saleStatus, "not_started");
  assert.equal(duplicatedEvent.payload.item.ticketing.enabled, false);
  cleanupEventId = duplicatedEvent.payload.item._id;

  const historyOrder = await Order.findOne();
  assert.ok(historyOrder, "A seeded Order is required for history protection.");
  const historyEvent = await Event.findById(historyOrder.event);
  const protectedChange = await request(`/admin/events/${historyEvent._id}`, {
    method: "PATCH", token, body: { venue: otherVenue._id },
  });
  assert.equal(protectedChange.response.status, 409);
  assert.ok(protectedChange.payload.details.usage.orders > 0);

  const summary = await request(`/admin/events/${validEvent._id}/ticketing-summary`, { token });
  assert.equal(summary.response.status, 200);
  const activeLockCount = await SeatLock.countDocuments({ event: validEvent._id, status: "active", expiresAt: { $gt: new Date() } });
  assert.equal(summary.payload.item.stats.activeLocksCount, activeLockCount);
  assert.ok(Number.isFinite(summary.payload.item.stats.occupancyPercentage));

  const usedPlan = await PricePlan.findById(historyEvent.pricePlan);
  assert.ok(usedPlan, "Order Event must have a PricePlan.");
  const protectedPlan = await request(`/admin/price-plans/${usedPlan._id}`, {
    method: "PATCH", token, body: { currency: usedPlan.currency === "RSD" ? "EUR" : "RSD" },
  });
  assert.equal(protectedPlan.response.status, 409);

  const duplicatedPlan = await request(`/admin/price-plans/${usedPlan._id}/duplicate`, {
    method: "POST",
    token,
    body: { name: `Phase 4A test version ${Date.now()}` },
  });
  assert.equal(duplicatedPlan.response.status, 201);
  assert.equal(duplicatedPlan.payload.item.status, "draft");
  assert.equal(String(duplicatedPlan.payload.item.parentPlan._id || duplicatedPlan.payload.item.parentPlan), String(usedPlan._id));
  cleanupPlanId = duplicatedPlan.payload.item._id;

  const tempCode = `T4A_${Date.now()}`;
  const createdCategory = await request("/admin/price-categories", {
    method: "POST", token, body: { code: tempCode, name: "Phase 4A temporary", status: "active" },
  });
  assert.equal(createdCategory.response.status, 201);
  const tempCategoryId = createdCategory.payload.item._id;
  cleanupCategoryId = tempCategoryId;

  const duplicateRules = await request("/admin/price-plans/validate", {
    method: "POST", token, body: {
      name: "Phase 4A duplicate rule test", venue: venue._id, productionTypes: [production.type],
      isPremiere: false, currency: "RSD", status: "draft",
      rules: [{ priceCategory: tempCategoryId, amount: 100 }, { priceCategory: tempCategoryId, amount: 200 }],
    },
  });
  assert.equal(duplicateRules.payload.valid, false);
  assert.ok(duplicateRules.payload.errors.some((item) => item.code === "duplicate_category"));

  const invalidAmount = await request("/admin/price-plans/validate", {
    method: "POST", token, body: {
      name: "Phase 4A amount test", venue: venue._id, productionTypes: [production.type],
      isPremiere: false, currency: "RSD", status: "draft", rules: [{ priceCategory: tempCategoryId, amount: -1 }],
    },
  });
  assert.equal(invalidAmount.payload.valid, false);
  assert.ok(invalidAmount.payload.errors.some((item) => item.code === "invalid_amount"));

  const usedCategory = await PriceCategory.findOne({ code: "I" });
  const protectedCategoryDelete = await request(`/admin/price-categories/${usedCategory._id}`, { method: "DELETE", token });
  assert.equal(protectedCategoryDelete.response.status, 409);

  const deletedTempCategory = await request(`/admin/price-categories/${tempCategoryId}`, { method: "DELETE", token });
  assert.equal(deletedTempCategory.response.status, 200);
  cleanupCategoryId = null;

  const repertoire = await request("/public/repertoire?view=current");
  assert.equal(repertoire.response.status, 200);
  assert.ok(Array.isArray(repertoire.payload.events));
  const seats = await request(`/public/events/${validEvent._id}/seats`);
  assert.equal(seats.response.status, 200, JSON.stringify(seats.payload));
  assert.ok(Array.isArray(seats.payload.seats));

  await cleanupTemporaryRecords();
  cleanupEventId = null;
  cleanupPlanId = null;
  console.log("Phase 4A Event/pricing smoke tests passed (26 assertions/scenarios)." );
  if (serverErrors) console.log(serverErrors.trim());
};

run()
  .then(async () => {
    if (mongoose.connection.readyState) await cleanupTemporaryRecords();
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (serverProcess) serverProcess.kill();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    if (mongoose.connection.readyState) await cleanupTemporaryRecords();
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  });
