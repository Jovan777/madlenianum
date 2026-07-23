const asyncHandler = require("../utils/asyncHandler");
const Event = require("../models/Event");
const SeatMap = require("../models/SeatMap");
const Seat = require("../models/Seat");
const {
  adminSeatDto,
  calculateEffectiveSeatStates,
} = require("../services/effectiveSeatState.service");
const {
  assertSeatMapCanBeDeleted,
  getSeatMapUsage,
  getSeatMapWarnings,
  validateSeatBatchUpdate,
  validateSeatMapPayload,
} = require("../services/seatMapAdministration.service");
const {
  conflictError,
  idOf,
  validationError,
} = require("../services/ticketingConfiguration.service");

const populateSeat = [{ path: "priceCategory" }, { path: "companionSeat" }];

const seatMapDto = async (item, { includeWarnings = true } = {}) => {
  const [usage, totalSeats, activeSeats, sections, warnings] = await Promise.all([
    getSeatMapUsage(item._id),
    Seat.countDocuments({ seatMap: item._id }),
    Seat.countDocuments({ seatMap: item._id, isActive: true }),
    Seat.distinct("section", { seatMap: item._id }),
    includeWarnings ? getSeatMapWarnings(item) : [],
  ]);
  const object = item.toObject ? item.toObject() : { ...item };
  return {
    ...object,
    seatCounts: { total: totalSeats, active: activeSeats },
    sectionNames: sections.filter(Boolean).sort((a, b) => a.localeCompare(b, "sr")),
    usage,
    configurationWarnings: warnings,
  };
};

const buildFilter = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.venue) filter.venue = query.venue;
  if (query.q) {
    const escaped = String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: new RegExp(escaped, "i") },
      { description: new RegExp(escaped, "i") },
    ];
  }
  return filter;
};

const getSeatMaps = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const [items, total] = await Promise.all([
    SeatMap.find(filter)
      .populate("venue")
      .sort("name")
      .skip((page - 1) * limit)
      .limit(limit),
    SeatMap.countDocuments(filter),
  ]);
  res.json({
    success: true,
    items: await Promise.all(items.map((item) => seatMapDto(item))),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getSeatMapById = asyncHandler(async (req, res) => {
  const item = await SeatMap.findById(req.params.id).populate("venue");
  if (!item) {
    const error = new Error("Mapa sedišta nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, item: await seatMapDto(item) });
});

const createSeatMap = asyncHandler(async (req, res) => {
  const validation = await validateSeatMapPayload(req.body);
  if (validation.errors.length) {
    throw validationError("Mapa sedišta nije ispravna.", validation.errors, validation.warnings);
  }
  const item = await SeatMap.create(req.body);
  const populated = await SeatMap.findById(item._id).populate("venue");
  res.status(201).json({ success: true, item: await seatMapDto(populated) });
});

const updateSeatMap = asyncHandler(async (req, res) => {
  const item = await SeatMap.findById(req.params.id);
  if (!item) {
    const error = new Error("Mapa sedišta nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  const usage = await getSeatMapUsage(item._id);
  if (req.body.venue !== undefined
      && idOf(req.body.venue) !== idOf(item.venue)
      && usage.hasUsage) {
    throw conflictError("Korišćena mapa ne može biti premeštena na drugu scenu.", {
      fields: ["venue"],
      usage,
      recommendation: "Napravite duplikat mape za novu scenu.",
    });
  }
  const validation = await validateSeatMapPayload(req.body, item);
  if (validation.errors.length) {
    throw validationError("Mapa sedišta nije ispravna.", validation.errors, validation.warnings);
  }
  const allowed = ["venue", "name", "slug", "description", "canvas", "sections", "status"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });
  await item.save();
  const updated = await SeatMap.findById(item._id).populate("venue");
  res.json({ success: true, item: await seatMapDto(updated) });
});

const bulkUpdateSeats = asyncHandler(async (req, res) => {
  const seatMap = await SeatMap.findById(req.params.id);
  if (!seatMap) {
    const error = new Error("Mapa sedišta nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  if (req.body.changes?.seatMap !== undefined || req.body.changes?.venue !== undefined) {
    throw conflictError("Grupna izmena ne može premestiti sedišta na drugu mapu ili scenu.", {
      fields: ["seatMap", "venue"],
    });
  }
  const validation = await validateSeatBatchUpdate(
    seatMap,
    req.body.seatIds,
    req.body.changes || {},
    req.body.updates || []
  );

  const structuralFields = new Set(["label", "section", "row", "number"]);
  const hasStructuralChange = validation.updates.some((entry) =>
    Object.keys(entry.changes).some((field) => structuralFields.has(field))
  );
  if (hasStructuralChange) {
    const usage = await getSeatMapUsage(seatMap._id);
    if (usage.hasHistory) {
      throw conflictError("Identitet sedišta na mapi sa ticketing istorijom ne može biti grupno promenjen.", {
        usage,
        recommendation: "Dozvoljene su vizuelne izmene koordinata. Za strukturnu promenu duplirajte mapu.",
      });
    }
  }

  await Seat.bulkWrite(
    validation.updates.map((entry) => ({
      updateOne: {
        filter: { _id: entry.seatId, seatMap: seatMap._id },
        update: { $set: entry.changes },
      },
    })),
    { ordered: true }
  );
  const items = await Seat.find({
    _id: { $in: validation.updates.map((entry) => entry.seatId) },
  }).populate(populateSeat).sort("section sortOrder row number label");
  res.json({ success: true, count: items.length, items });
});

const getSeatMapPreview = asyncHandler(async (req, res) => {
  const seatMap = await SeatMap.findById(req.params.id).populate("venue");
  if (!seatMap) {
    const error = new Error("Mapa sedišta nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  let event = null;
  let seatItems;
  if (req.query.event) {
    event = await Event.findById(req.query.event)
      .populate("production")
      .populate("venue")
      .populate("seatMap")
      .populate({ path: "pricePlan", populate: "rules.priceCategory" });
    if (!event) {
      const error = new Error("Termin nije pronađen.");
      error.statusCode = 404;
      throw error;
    }
    if (idOf(event.seatMap) !== idOf(seatMap)) {
      throw conflictError("Termin ne koristi ovu mapu sedišta.", {
        eventSeatMap: idOf(event.seatMap),
        requestedSeatMap: idOf(seatMap),
      });
    }
    const effective = await calculateEffectiveSeatStates(event);
    seatItems = effective.items.map(adminSeatDto);
  } else {
    const seats = await Seat.find({ seatMap: seatMap._id })
      .populate(populateSeat)
      .sort("section sortOrder row number label");
    seatItems = seats.map((seat) => ({
      ...seat.toObject(),
      id: seat._id,
      availabilityStatus: !seat.isActive || !seat.isSellable || seat.seatType === "unavailable"
        ? "unavailable"
        : "available",
      baseIsSellable: Boolean(seat.isSellable),
      price: null,
      override: null,
      lock: null,
    }));
  }
  const compatibleEvents = await Event.find({
    seatMap: seatMap._id,
    status: { $in: ["draft", "scheduled", "postponed"] },
  }).populate("production", "title").sort("startsAt").select("production startsAt status saleStatus");
  res.json({
    success: true,
    item: {
      seatMap,
      event,
      seats: seatItems,
      compatibleEvents,
      usage: await getSeatMapUsage(seatMap._id),
      warnings: await getSeatMapWarnings(seatMap),
    },
  });
});

const duplicateSeatMap = asyncHandler(async (req, res) => {
  const source = await SeatMap.findById(req.params.id);
  if (!source) {
    const error = new Error("Mapa sedišta nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  const suffix = Date.now().toString(36);
  const duplicate = await SeatMap.create({
    venue: source.venue,
    name: String(req.body?.name || `${source.name} - kopija`).trim(),
    slug: `${source.slug || "mapa"}-kopija-${suffix}`,
    description: source.description,
    canvas: source.canvas,
    sections: source.sections,
    status: "draft",
  });
  const sourceSeats = await Seat.find({ seatMap: source._id }).lean();
  if (sourceSeats.length) {
    const newIds = new Map(
      sourceSeats.map((seat) => [String(seat._id), new (require("mongoose").Types.ObjectId)()])
    );
    await Seat.insertMany(sourceSeats.map((seat) => {
      const { _id, createdAt, updatedAt, __v, companionSeat, ...copy } = seat;
      return {
        ...copy,
        _id: newIds.get(String(_id)),
        seatMap: duplicate._id,
        companionSeat: companionSeat ? newIds.get(String(companionSeat)) : undefined,
      };
    }), { ordered: true });
  }
  const populated = await SeatMap.findById(duplicate._id).populate("venue");
  res.status(201).json({
    success: true,
    item: await seatMapDto(populated),
    meta: { sourceSeatMapId: String(source._id), copiedSeats: sourceSeats.length },
  });
});

const archiveSeatMap = asyncHandler(async (req, res) => {
  const item = await SeatMap.findById(req.params.id);
  if (!item) {
    const error = new Error("Mapa sedišta nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  item.status = "archived";
  await item.save();
  const populated = await SeatMap.findById(item._id).populate("venue");
  res.json({ success: true, item: await seatMapDto(populated) });
});

const deleteSeatMap = asyncHandler(async (req, res) => {
  const item = await SeatMap.findById(req.params.id);
  if (!item) {
    const error = new Error("Mapa sedišta nije pronađena.");
    error.statusCode = 404;
    throw error;
  }
  await assertSeatMapCanBeDeleted(item);
  await item.deleteOne();
  res.json({ success: true, message: "Mapa sedišta je obrisana." });
});

module.exports = {
  archiveSeatMap,
  bulkUpdateSeats,
  createSeatMap,
  deleteSeatMap,
  duplicateSeatMap,
  getSeatMapById,
  getSeatMapPreview,
  getSeatMaps,
  updateSeatMap,
};
