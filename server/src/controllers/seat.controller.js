const asyncHandler = require("../utils/asyncHandler");
const Seat = require("../models/Seat");
const SeatMap = require("../models/SeatMap");
const {
  getSeatUsage,
  normalizeSeatChanges,
  seatStructuralChanges,
  validateSeatBatchUpdate,
  validateSeatDocuments,
} = require("../services/seatMapAdministration.service");
const {
  conflictError,
  idOf,
  validationError,
} = require("../services/ticketingConfiguration.service");

const populateSeat = [
  { path: "seatMap" },
  { path: "venue" },
  { path: "priceCategory" },
  { path: "companionSeat" },
];

const getSeats = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.seatMap) filter.seatMap = req.query.seatMap;
  if (req.query.venue) filter.venue = req.query.venue;
  if (req.query.section) filter.section = req.query.section;
  if (req.query.seatType) filter.seatType = req.query.seatType;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
  if (req.query.isSellable !== undefined) filter.isSellable = req.query.isSellable === "true";
  if (req.query.q) {
    const escaped = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { label: new RegExp(escaped, "i") },
      { row: new RegExp(escaped, "i") },
      { section: new RegExp(escaped, "i") },
    ];
  }
  const items = await Seat.find(filter).populate(populateSeat).sort("section sortOrder row number label");
  res.json({ success: true, items });
});

const getSeatById = asyncHandler(async (req, res) => {
  const item = await Seat.findById(req.params.id).populate(populateSeat);
  if (!item) {
    const error = new Error("Sedište nije pronađeno.");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, item, meta: { usage: await getSeatUsage(item) } });
});

const createSeat = asyncHandler(async (req, res) => {
  const seatMap = await SeatMap.findById(req.body.seatMap);
  if (!seatMap) {
    const error = new Error("Mapa sedišta nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  if (req.body.venue && idOf(req.body.venue) !== idOf(seatMap.venue)) {
    throw validationError("Sedište i mapa moraju pripadati istoj sceni.", []);
  }
  const payload = {
    ...normalizeSeatChanges(req.body),
    seatMap: seatMap._id,
    venue: seatMap.venue,
  };
  const existing = await Seat.find({ seatMap: seatMap._id });
  const errors = await validateSeatDocuments(seatMap, [
    ...existing.map((seat) => seat.toObject()),
    { ...payload, _id: "novo-sediste" },
  ]);
  if (errors.length) throw validationError("Sedište nije ispravno.", errors);
  const item = await Seat.create(payload);
  res.status(201).json({
    success: true,
    item: await Seat.findById(item._id).populate(populateSeat),
  });
});

const createManySeats = asyncHandler(async (req, res) => {
  const seats = req.body.seats;
  if (!Array.isArray(seats) || !seats.length) {
    throw validationError("Lista sedišta je obavezna.", []);
  }
  const seatMap = await SeatMap.findById(seats[0]?.seatMap);
  if (!seatMap) {
    const error = new Error("Mapa sedišta nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  if (seats.some((seat) => idOf(seat.seatMap) !== idOf(seatMap))) {
    throw validationError("Sva sedišta moraju pripadati istoj mapi.", []);
  }
  if (seats.some((seat) => seat.venue && idOf(seat.venue) !== idOf(seatMap.venue))) {
    throw validationError("Sedišta i mapa moraju pripadati istoj sceni.", []);
  }
  const existing = await Seat.find({ seatMap: seatMap._id });
  const payload = seats.map((seat, index) => ({
    ...normalizeSeatChanges(seat),
    _id: `novo-${index}`,
    seatMap: seatMap._id,
    venue: seatMap.venue,
  }));
  const errors = await validateSeatDocuments(seatMap, [
    ...existing.map((seat) => seat.toObject()),
    ...payload,
  ]);
  if (errors.length) throw validationError("Sedišta nisu ispravna.", errors);
  payload.forEach((seat) => delete seat._id);
  const created = await Seat.insertMany(payload, { ordered: true });
  res.status(201).json({ success: true, count: created.length, items: created });
});

const updateSeat = asyncHandler(async (req, res) => {
  const item = await Seat.findById(req.params.id);
  if (!item) {
    const error = new Error("Sedište nije pronađeno.");
    error.statusCode = 404;
    throw error;
  }
  if ((req.body.seatMap && idOf(req.body.seatMap) !== idOf(item.seatMap))
      || (req.body.venue && idOf(req.body.venue) !== idOf(item.venue))) {
    throw conflictError("Postojeće sedište ne može biti premešteno na drugu mapu ili scenu.", {
      fields: ["seatMap", "venue"],
    });
  }
  const changes = normalizeSeatChanges(req.body);
  const structural = seatStructuralChanges(item, changes);
  if (structural.length) {
    const usage = await getSeatUsage(item);
    if (usage.hasHistory) {
      throw conflictError("Identitet sedišta sa ticketing istorijom ne može biti promenjen.", {
        fields: structural,
        usage,
      });
    }
  }
  const seatMap = await SeatMap.findById(item.seatMap);
  await validateSeatBatchUpdate(seatMap, [String(item._id)], changes, []);
  Object.assign(item, changes, { seatMap: seatMap._id, venue: seatMap.venue });
  await item.save();
  res.json({ success: true, item: await Seat.findById(item._id).populate(populateSeat) });
});

const deleteSeat = asyncHandler(async (req, res) => {
  const item = await Seat.findById(req.params.id);
  if (!item) {
    const error = new Error("Sedište nije pronađeno.");
    error.statusCode = 404;
    throw error;
  }
  const usage = await getSeatUsage(item);
  if (usage.hasUsage) {
    throw conflictError("Korišćeno sedište ne može biti fizički obrisano.", {
      usage,
      recommendation: "Označite sedište kao fizički neaktivno ili duplirajte mapu.",
    });
  }
  await item.deleteOne();
  res.json({ success: true, message: "Sedište je obrisano." });
});

module.exports = {
  createManySeats,
  createSeat,
  deleteSeat,
  getSeatById,
  getSeats,
  updateSeat,
};
