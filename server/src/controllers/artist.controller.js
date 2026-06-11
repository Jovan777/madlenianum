const asyncHandler = require("../utils/asyncHandler");
const Artist = require("../models/Artist");

const getArtists = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.q) {
    filter.$or = [
      { displayName: new RegExp(req.query.q, "i") },
      { biography: new RegExp(req.query.q, "i") },
      { professions: new RegExp(req.query.q, "i") },
    ];
  }

  const total = await Artist.countDocuments(filter);

  const artists = await Artist.find(filter)
    .populate("image")
    .populate("gallery")
    .sort("weight displayName")
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: artists,
  });
});

const getArtistById = asyncHandler(async (req, res) => {
  const artist = await Artist.findById(req.params.id)
    .populate("image")
    .populate("gallery");

  if (!artist) {
    res.status(404);
    throw new Error("Umetnik nije pronađen.");
  }

  res.json({
    success: true,
    item: artist,
  });
});

const createArtist = asyncHandler(async (req, res) => {
  const artist = await Artist.create(req.body);

  res.status(201).json({
    success: true,
    item: artist,
  });
});

const updateArtist = asyncHandler(async (req, res) => {
  const artist = await Artist.findById(req.params.id);

  if (!artist) {
    res.status(404);
    throw new Error("Umetnik nije pronađen.");
  }

  Object.assign(artist, req.body);

  await artist.save();

  const updatedArtist = await Artist.findById(artist._id)
    .populate("image")
    .populate("gallery");

  res.json({
    success: true,
    item: updatedArtist,
  });
});

const deleteArtist = asyncHandler(async (req, res) => {
  const artist = await Artist.findById(req.params.id);

  if (!artist) {
    res.status(404);
    throw new Error("Umetnik nije pronađen.");
  }

  await artist.deleteOne();

  res.json({
    success: true,
    message: "Umetnik je obrisan.",
  });
});

module.exports = {
  getArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
};