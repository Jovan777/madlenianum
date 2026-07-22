require("dotenv").config();

const connectDB = require("../config/db");
const Event = require("../models/Event");
const OrderItem = require("../models/OrderItem");
const PricePlan = require("../models/PricePlan");
const Seat = require("../models/Seat");

const relinkLegacyOrderItemSeats = async () => {
  const items = await OrderItem.find().select("_id event seat seatLabel").lean();
  if (!items.length) return { relinked: 0, unresolved: 0 };

  const eventIds = [...new Set(items.map((item) => String(item.event)))];
  const events = await Event.find({ _id: { $in: eventIds } }).select("seatMap").lean();
  const seatMapByEvent = new Map(events.map((event) => [String(event._id), String(event.seatMap || "")]));
  const seatMapIds = [...new Set(events.map((event) => event.seatMap).filter(Boolean).map(String))];
  const seats = await Seat.find({ seatMap: { $in: seatMapIds } }).select("_id seatMap label").lean();
  const seatById = new Map(seats.map((seat) => [String(seat._id), seat]));
  const seatsByMapAndLabel = new Map();

  seats.forEach((seat) => {
    const key = `${seat.seatMap}:${String(seat.label || "").trim()}`;
    const matches = seatsByMapAndLabel.get(key) || [];
    matches.push(seat);
    seatsByMapAndLabel.set(key, matches);
  });

  const operations = [];
  let unresolved = 0;
  items.forEach((item) => {
    const expectedSeatMap = seatMapByEvent.get(String(item.event));
    if (!expectedSeatMap) return;
    const currentSeat = seatById.get(String(item.seat));
    if (currentSeat && String(currentSeat.seatMap) === expectedSeatMap) return;

    const key = `${expectedSeatMap}:${String(item.seatLabel || "").trim()}`;
    const matches = seatsByMapAndLabel.get(key) || [];
    if (matches.length !== 1) {
      unresolved += 1;
      return;
    }
    operations.push({
      updateOne: {
        filter: { _id: item._id, seat: item.seat },
        update: { $set: { seat: matches[0]._id } },
      },
    });
  });

  if (!operations.length) return { relinked: 0, unresolved };
  const result = await OrderItem.bulkWrite(operations);
  return { relinked: result.modifiedCount, unresolved };
};

const migratePhase4aTicketing = async () => {
  await connectDB();

  const [completedEvents, closedSales, notStartedSales, revisedPlans, orderItemSeats] = await Promise.all([
    Event.updateMany({ status: "finished" }, { $set: { status: "completed" } }),
    Event.updateMany({ saleStatus: "sales_closed" }, { $set: { saleStatus: "closed" } }),
    Event.updateMany({ saleStatus: "not_on_sale" }, { $set: { saleStatus: "not_started" } }),
    PricePlan.updateMany(
      { $or: [{ revision: { $exists: false } }, { revision: null }] },
      { $set: { revision: 1 } }
    ),
    relinkLegacyOrderItemSeats(),
  ]);

  console.log("Phase 4A ticketing migration completed.");
  console.log({
    completedEvents: completedEvents.modifiedCount,
    closedSales: closedSales.modifiedCount,
    notStartedSales: notStartedSales.modifiedCount,
    revisedPlans: revisedPlans.modifiedCount,
    orderItemSeats,
  });
};

migratePhase4aTicketing()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
