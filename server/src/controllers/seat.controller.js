const asyncHandler = require("../utils/asyncHandler");
const Seat = require("../models/Seat");

const populateSeat = [
  { path: "seatMap" },
  { path: "venue" },
  { path: "priceCategory" },
];

const getSeats = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.seatMap) filter.seatMap = req.query.seatMap;
  if (req.query.venue) filter.venue = req.query.venue;
  if (req.query.section) filter.section = req.query.section;
  if (req.query.seatType) filter.seatType = req.query.seatType;

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  if (req.query.isSellable !== undefined) {
    filter.isSellable = req.query.isSellable === "true";
  }

  if (req.query.q) {
    filter.$or = [
      { label: new RegExp(req.query.q, "i") },
      { row: new RegExp(req.query.q, "i") },
      { section: new RegExp(req.query.q, "i") },
    ];
  }

  const items = await Seat.find(filter)
    .populate(populateSeat)
    .sort("section sortOrder row number label");

  res.json({
    success: true,
    items,
  });
});

const getSeatById = asyncHandler(async (req, res) => {
  const item = await Seat.findById(req.params.id).populate(populateSeat);

  if (!item) {
    res.status(404);
    throw new Error("Seat not found.");
  }

  res.json({
    success: true,
    item,
  });
});

const createSeat = asyncHandler(async (req, res) => {
  const item = await Seat.create(req.body);

  const populatedItem = await Seat.findById(item._id).populate(populateSeat);

  res.status(201).json({
    success: true,
    item: populatedItem,
  });
});

const createManySeats = asyncHandler(async (req, res) => {
  const { seats } = req.body;

  if (!Array.isArray(seats) || seats.length === 0) {
    res.status(400);
    throw new Error("Seats array is required.");
  }

  const createdSeats = await Seat.insertMany(seats, {
    ordered: false,
  });

  res.status(201).json({
    success: true,
    count: createdSeats.length,
    items: createdSeats,
  });
});

const updateSeat = asyncHandler(async (req, res) => {
  const item = await Seat.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Seat not found.");
  }

  Object.assign(item, req.body);
  await item.save();

  const updatedItem = await Seat.findById(item._id).populate(populateSeat);

  res.json({
    success: true,
    item: updatedItem,
  });
});

const deleteSeat = asyncHandler(async (req, res) => {
  const item = await Seat.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Seat not found.");
  }

  await item.deleteOne();

  res.json({
    success: true,
    message: "Seat deleted.",
  });
});

module.exports = {
  getSeats,
  getSeatById,
  createSeat,
  createManySeats,
  updateSeat,
  deleteSeat,
};