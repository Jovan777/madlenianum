const asyncHandler = require("../utils/asyncHandler");
const Venue = require("../models/Venue");

const getVenues = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.venueType) {
    filter.venueType = req.query.venueType;
  }

  if (req.query.q) {
    filter.$or = [
      { name: new RegExp(req.query.q, "i") },
      { description: new RegExp(req.query.q, "i") },
    ];
  }

  const venues = await Venue.find(filter)
    .populate("images")
    .sort("weight name");

  res.json({
    success: true,
    items: venues,
  });
});

const getVenueById = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id).populate("images");

  if (!venue) {
    res.status(404);
    throw new Error("Scena/prostor nije pronađen.");
  }

  res.json({
    success: true,
    item: venue,
  });
});

const createVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.create(req.body);

  res.status(201).json({
    success: true,
    item: venue,
  });
});

const updateVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);

  if (!venue) {
    res.status(404);
    throw new Error("Scena/prostor nije pronađen.");
  }

  Object.assign(venue, req.body);
  await venue.save();

  const updatedVenue = await Venue.findById(venue._id).populate("images");

  res.json({
    success: true,
    item: updatedVenue,
  });
});

const deleteVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);

  if (!venue) {
    res.status(404);
    throw new Error("Scena/prostor nije pronađen.");
  }

  await venue.deleteOne();

  res.json({
    success: true,
    message: "Scena/prostor je obrisan.",
  });
});

module.exports = {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
};