const asyncHandler = require("../utils/asyncHandler");
const SeatMap = require("../models/SeatMap");
const Seat = require("../models/Seat");

const getSeatMaps = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.venue) filter.venue = req.query.venue;

  if (req.query.q) {
    filter.$or = [
      { name: new RegExp(req.query.q, "i") },
      { description: new RegExp(req.query.q, "i") },
    ];
  }

  const items = await SeatMap.find(filter)
    .populate("venue")
    .sort("-createdAt");

  res.json({
    success: true,
    items,
  });
});

const getSeatMapById = asyncHandler(async (req, res) => {
  const item = await SeatMap.findById(req.params.id).populate("venue");

  if (!item) {
    res.status(404);
    throw new Error("Seat map not found.");
  }

  const seatsCount = await Seat.countDocuments({ seatMap: item._id });

  res.json({
    success: true,
    item,
    seatsCount,
  });
});

const createSeatMap = asyncHandler(async (req, res) => {
  const item = await SeatMap.create(req.body);

  const populatedItem = await SeatMap.findById(item._id).populate("venue");

  res.status(201).json({
    success: true,
    item: populatedItem,
  });
});

const updateSeatMap = asyncHandler(async (req, res) => {
  const item = await SeatMap.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Seat map not found.");
  }

  Object.assign(item, req.body);
  await item.save();

  const updatedItem = await SeatMap.findById(item._id).populate("venue");

  res.json({
    success: true,
    item: updatedItem,
  });
});

const deleteSeatMap = asyncHandler(async (req, res) => {
  const item = await SeatMap.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Seat map not found.");
  }

  const seatsCount = await Seat.countDocuments({ seatMap: item._id });

  if (seatsCount > 0) {
    res.status(400);
    throw new Error("Seat map cannot be deleted while it has seats.");
  }

  await item.deleteOne();

  res.json({
    success: true,
    message: "Seat map deleted.",
  });
});

module.exports = {
  getSeatMaps,
  getSeatMapById,
  createSeatMap,
  updateSeatMap,
  deleteSeatMap,
};