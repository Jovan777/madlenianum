require("dotenv").config();

const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const EventSeatOverride = require("../models/EventSeatOverride");
const Order = require("../models/Order");
const RentalInquiry = require("../models/RentalInquiry");
const EventPlanningInquiry = require("../models/EventPlanningInquiry");
const Seat = require("../models/Seat");
const SeatLock = require("../models/SeatLock");

const requiredIndexes = [
  {
    model: SeatLock,
    key: { event: 1, seat: 1 },
    options: { unique: true, partialStatus: "active" },
    purpose: "prevents duplicate active locks for one Event seat",
  },
  {
    model: SeatLock,
    key: { expiresAt: 1 },
    purpose: "supports lock-expiry cleanup",
  },
  {
    model: Order,
    key: { idempotencyKey: 1 },
    options: { unique: true, sparse: true },
    purpose: "prevents duplicate guest Order submission",
  },
  {
    model: Order,
    key: { publicAccessTokenHash: 1 },
    options: { sparse: true },
    purpose: "supports secure guest Order lookup",
  },
  {
    model: Order,
    key: { expiresAt: 1 },
    purpose: "supports Order expiry processing",
  },
  {
    model: Seat,
    key: { seatMap: 1, label: 1 },
    options: { unique: true },
    purpose: "preserves unique stable seat identity per map",
  },
  {
    model: EventSeatOverride,
    key: { event: 1, seat: 1 },
    options: { unique: true },
    purpose: "prevents conflicting duplicate Event overrides",
  },
  {
    model: RentalInquiry,
    key: { idempotencyKey: 1 },
    options: { unique: true, sparse: true },
    purpose: "prevents duplicate rental inquiries",
  },
  {
    model: EventPlanningInquiry,
    key: { idempotencyKey: 1 },
    options: { unique: true, sparse: true },
    purpose: "prevents duplicate event-planning inquiries",
  },
];

const sameKey = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);

const run = async () => {
  assert.ok(process.env.MONGO_URI, "MONGO_URI is required.");
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  for (const requirement of requiredIndexes) {
    const indexes = await requirement.model.collection.indexes();
    const match = indexes.find((index) => sameKey(index.key, requirement.key));
    assert.ok(
      match,
      `${requirement.model.modelName} is missing index ${JSON.stringify(requirement.key)} (${requirement.purpose}).`
    );
    if (requirement.options?.unique) assert.equal(match.unique, true);
    if (requirement.options?.sparse) assert.equal(match.sparse, true);
    if (requirement.options?.partialStatus) {
      assert.equal(
        match.partialFilterExpression?.status,
        requirement.options.partialStatus
      );
    }
    console.log(`OK ${requirement.model.collection.name}: ${requirement.purpose}`);
  }

  console.log("Critical MongoDB index validation passed (read-only). TTL indexes are intentionally not used because expired ticketing records are retained as history.");
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
