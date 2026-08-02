const mongoose = require("mongoose");

const Event = require("../models/Event");
const EventSeatOverride = require("../models/EventSeatOverride");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const PriceCategory = require("../models/PriceCategory");
const Seat = require("../models/Seat");
const SeatLock = require("../models/SeatLock");
const SeatMap = require("../models/SeatMap");
const Venue = require("../models/Venue");
const {
  SEAT_MAP_STATUSES,
} = require("../constants/seatMap.constants");
const {
  conflictError,
  idOf,
  issue,
  validationError,
} = require("./ticketingConfiguration.service");

const validObjectId = (value) => Boolean(
  value && mongoose.Types.ObjectId.isValid(idOf(value))
);

const finiteNumber = (value) => Number.isFinite(Number(value));

const getSeatMapUsage = async (seatMapId) => {
  const events = await Event.find({ seatMap: seatMapId })
    .select("_id startsAt status saleStatus")
    .lean();
  const eventIds = events.map((event) => event._id);
  const seatIds = await Seat.find({ seatMap: seatMapId }).distinct("_id");
  const [orders, orderItems, locks, activeLocks, overrides] = await Promise.all([
    eventIds.length
      ? Order.countDocuments({ event: { $in: eventIds } })
      : 0,
    seatIds.length
      ? OrderItem.countDocuments({ seat: { $in: seatIds } })
      : 0,
    seatIds.length
      ? SeatLock.countDocuments({ seat: { $in: seatIds } })
      : 0,
    seatIds.length
      ? SeatLock.countDocuments({
          seat: { $in: seatIds },
          status: "active",
          expiresAt: { $gt: new Date() },
        })
      : 0,
    EventSeatOverride.countDocuments({ seatMap: seatMapId }),
  ]);

  return {
    events: events.length,
    futureEvents: events.filter((event) => new Date(event.startsAt) > new Date()).length,
    orders,
    orderItems,
    locks,
    activeLocks,
    overrides,
    seats: seatIds.length,
    hasUsage: events.length + orders + orderItems + locks + overrides > 0,
    hasHistory: orders + orderItems + locks > 0,
    eventIds: eventIds.map(String),
  };
};

const getSeatUsage = async (seat) => {
  const [orderItems, locks, activeLocks, overrides, mapEvents] = await Promise.all([
    OrderItem.countDocuments({ seat: seat._id }),
    SeatLock.countDocuments({ seat: seat._id }),
    SeatLock.countDocuments({
      seat: seat._id,
      status: "active",
      expiresAt: { $gt: new Date() },
    }),
    EventSeatOverride.countDocuments({ seat: seat._id }),
    Event.countDocuments({ seatMap: seat.seatMap }),
  ]);

  return {
    orderItems,
    locks,
    activeLocks,
    overrides,
    mapEvents,
    hasHistory: orderItems + locks > 0,
    hasUsage: orderItems + locks + overrides + mapEvents > 0,
  };
};

const validateSeatMapPayload = async (payload = {}, existingMap = null) => {
  const current = existingMap?.toObject ? existingMap.toObject() : (existingMap || {});
  const effective = { ...current, ...payload };
  const errors = [];
  const warnings = [];

  if (!String(effective.name || "").trim()) {
    errors.push(issue("name", "required", "Naziv mape sedišta je obavezan."));
  }
  if (!validObjectId(effective.venue)) {
    errors.push(issue("venue", "invalid_object_id", "Scena nije ispravan ID."));
  }
  if (!SEAT_MAP_STATUSES.includes(effective.status || "draft")) {
    errors.push(issue("status", "invalid_status", "Status mape sedišta nije podržan."));
  }

  const width = Number(effective.canvas?.width);
  const height = Number(effective.canvas?.height);
  if (!Number.isFinite(width) || width < 200 || width > 10000) {
    errors.push(issue("canvas.width", "invalid_canvas", "Širina radne površine mora biti od 200 do 10000."));
  }
  if (!Number.isFinite(height) || height < 200 || height > 10000) {
    errors.push(issue("canvas.height", "invalid_canvas", "Visina radne površine mora biti od 200 do 10000."));
  }

  const sections = Array.isArray(effective.sections) ? effective.sections : [];
  const sectionKeys = sections.map((section) => String(section.key || "").trim().toLowerCase());
  if (sectionKeys.some((key) => !key)) {
    errors.push(issue("sections", "missing_section_key", "Svaka sekcija mora imati ključ."));
  }
  if (new Set(sectionKeys).size !== sectionKeys.length) {
    errors.push(issue("sections", "duplicate_section_key", "Ključevi sekcija moraju biti jedinstveni."));
  }
  sections.forEach((section, index) => {
    if (!String(section.name || "").trim()) {
      errors.push(issue(`sections.${index}.name`, "required", "Naziv sekcije je obavezan."));
    }
    if (!Number.isInteger(Number(section.capacity)) || Number(section.capacity) < 0) {
      errors.push(issue(`sections.${index}.capacity`, "invalid_capacity", "Kapacitet sekcije mora biti nenegativan ceo broj."));
    }
  });

  let venue = null;
  if (validObjectId(effective.venue)) {
    venue = await Venue.findById(idOf(effective.venue));
    if (!venue) {
      errors.push(issue("venue", "not_found", "Izabrana scena ne postoji."));
    }
  }

  if (existingMap) {
    const [activeSeats, totalSeats] = await Promise.all([
      Seat.countDocuments({ seatMap: existingMap._id, isActive: true }),
      Seat.countDocuments({ seatMap: existingMap._id }),
    ]);
    const configuredCapacity = sections.reduce(
      (total, section) => total + Number(section.capacity || 0),
      0
    );
    if (configuredCapacity && configuredCapacity !== activeSeats) {
      warnings.push(issue("sections", "capacity_mismatch", "Zbir kapaciteta sekcija se ne podudara sa brojem aktivnih sedišta.", {
        configuredCapacity,
        activeSeats,
        totalSeats,
      }));
    }
  }

  return { errors, warnings, venue, effective };
};

const normalizeSeatChanges = (changes = {}) => {
  const normalized = {};
  const allowed = [
    "label",
    "section",
    "row",
    "number",
    "seatType",
    "priceCategory",
    "x",
    "y",
    "width",
    "height",
    "rotation",
    "sortOrder",
    "isActive",
    "isSellable",
    "visualGroup",
    "isAccessible",
    "isCompanion",
    "companionSeat",
    "hasRestrictedView",
    "physicalNote",
  ];

  allowed.forEach((field) => {
    if (changes[field] !== undefined) normalized[field] = changes[field];
  });
  ["x", "y", "width", "height", "rotation", "sortOrder"].forEach((field) => {
    if (normalized[field] !== undefined) normalized[field] = Number(normalized[field]);
  });
  if (normalized.number !== undefined) {
    normalized.number = normalized.number === null || normalized.number === ""
      ? undefined
      : Number(normalized.number);
  }
  ["label", "section", "row", "visualGroup", "physicalNote"].forEach((field) => {
    if (normalized[field] !== undefined) normalized[field] = String(normalized[field] || "").trim();
  });
  if (normalized.priceCategory === "") normalized.priceCategory = null;
  if (normalized.companionSeat === "") normalized.companionSeat = null;
  return normalized;
};

const validateSeatDocuments = async (seatMap, seatDocuments) => {
  const errors = [];
  const categoryIds = new Set();
  const companionIds = new Set();
  const identities = new Map();
  const labels = new Map();

  seatDocuments.forEach((seat, index) => {
    const prefix = `seats.${index}`;
    if (!String(seat.section || "").trim()) {
      errors.push(issue(`${prefix}.section`, "required", `Sedište ${seat.label || index + 1} nema sekciju.`));
    }
    if (!String(seat.label || "").trim()) {
      errors.push(issue(`${prefix}.label`, "required", "Oznaka sedišta je obavezna."));
    }
    if (!finiteNumber(seat.x) || !finiteNumber(seat.y)) {
      errors.push(issue(`${prefix}.coordinates`, "invalid_coordinates", `Sedište ${seat.label || index + 1} nema ispravne koordinate.`));
    }
    if (Number(seat.x) < 0 || Number(seat.y) < 0
        || Number(seat.x) > 10000
        || Number(seat.y) > 10000) {
      errors.push(issue(`${prefix}.coordinates`, "outside_coordinate_space", `Sedište ${seat.label || index + 1} je van dozvoljenog koordinatnog prostora.`));
    }
    if (!finiteNumber(seat.width) || Number(seat.width) < 8 || Number(seat.width) > 200
        || !finiteNumber(seat.height) || Number(seat.height) < 8 || Number(seat.height) > 200) {
      errors.push(issue(`${prefix}.size`, "invalid_size", `Sedište ${seat.label || index + 1} nema ispravnu veličinu.`));
    }
    if (seat.number !== undefined && seat.number !== null
        && (!Number.isInteger(Number(seat.number)) || Number(seat.number) < 1)) {
      errors.push(issue(`${prefix}.number`, "invalid_number", `Broj sedišta ${seat.label || index + 1} mora biti pozitivan ceo broj.`));
    }

    const identity = seat.number === undefined || seat.number === null
      ? ""
      : [
          String(seat.section || "").trim().toLocaleLowerCase("sr"),
          String(seat.row || "").trim().toLocaleLowerCase("sr"),
          Number(seat.number),
        ].join("|");
    if (identity) {
      if (identities.has(identity)) {
        errors.push(issue(`${prefix}.number`, "duplicate_seat_identity", `Broj sedišta je dupliran u istoj sekciji i redu (${seat.section}, ${seat.row}, ${seat.number}).`, {
          otherSeatId: identities.get(identity),
        }));
      } else {
        identities.set(identity, idOf(seat));
      }
    }

    const labelKey = String(seat.label || "").trim().toLocaleLowerCase("sr");
    if (labelKey) {
      if (labels.has(labelKey)) {
        errors.push(issue(`${prefix}.label`, "duplicate_seat_label", `Oznaka sedišta ${seat.label} je duplirana.`, {
          otherSeatId: labels.get(labelKey),
        }));
      } else {
        labels.set(labelKey, idOf(seat));
      }
    }
    if (seat.priceCategory) categoryIds.add(idOf(seat.priceCategory));
    if (seat.companionSeat) companionIds.add(idOf(seat.companionSeat));
  });

  if (categoryIds.size) {
    const categories = await PriceCategory.find({ _id: { $in: [...categoryIds] } }).select("_id");
    if (categories.length !== categoryIds.size) {
      errors.push(issue("seats.priceCategory", "category_not_found", "Jedna ili više cenovnih kategorija ne postoje."));
    }
  }

  if (companionIds.size) {
    const companionSeats = await Seat.find({
      _id: { $in: [...companionIds] },
      seatMap: seatMap._id,
    }).select("_id");
    if (companionSeats.length !== companionIds.size) {
      errors.push(issue("seats.companionSeat", "invalid_companion", "Prateće sedište mora pripadati istoj mapi."));
    }
  }

  return errors;
};

const validateSeatBatchUpdate = async (seatMap, seatIds, commonChanges = {}, individualUpdates = []) => {
  if (!Array.isArray(seatIds) || !seatIds.length) {
    throw validationError("Izaberite najmanje jedno sedište.", [
      issue("seatIds", "required", "Lista sedišta je obavezna."),
    ]);
  }
  const normalizedIds = seatIds.map(String);
  if (new Set(normalizedIds).size !== normalizedIds.length
      || normalizedIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw validationError("Lista sedišta nije ispravna.", [
      issue("seatIds", "invalid_or_duplicate_ids", "ID vrednosti sedišta moraju biti ispravne i jedinstvene."),
    ]);
  }

  const allSeats = await Seat.find({ seatMap: seatMap._id });
  const selectedById = new Map(
    allSeats
      .filter((seat) => normalizedIds.includes(String(seat._id)))
      .map((seat) => [String(seat._id), seat])
  );
  if (selectedById.size !== normalizedIds.length) {
    throw validationError("Neka sedišta ne pripadaju ovoj mapi.", [
      issue("seatIds", "seat_map_mismatch", "Sva sedišta moraju pripadati izabranoj mapi."),
    ]);
  }

  const individualById = new Map();
  if (individualUpdates !== undefined) {
    if (!Array.isArray(individualUpdates)) {
      throw validationError("Pojedinačne izmene nisu ispravne.", [
        issue("updates", "invalid_array", "updates mora biti niz."),
      ]);
    }
    individualUpdates.forEach((entry) => {
      const id = String(entry?.seatId || "");
      if (!normalizedIds.includes(id) || individualById.has(id)) {
        throw validationError("Pojedinačne izmene nisu ispravne.", [
          issue("updates", "invalid_or_duplicate_seat", "Svaka pojedinačna izmena mora referencirati jedno izabrano sedište."),
        ]);
      }
      individualById.set(id, normalizeSeatChanges(entry.changes || {}));
    });
  }

  const common = normalizeSeatChanges(commonChanges);
  const effectiveSeats = allSeats.map((seat) => {
    const object = seat.toObject();
    const id = String(seat._id);
    if (!selectedById.has(id)) return object;
    return {
      ...object,
      ...common,
      ...(individualById.get(id) || {}),
      venue: seatMap.venue,
      seatMap: seatMap._id,
    };
  });
  const errors = await validateSeatDocuments(seatMap, effectiveSeats);
  if (errors.length) {
    throw validationError("Izmene sedišta nisu ispravne.", errors);
  }

  return {
    selectedSeats: normalizedIds.map((id) => selectedById.get(id)),
    updates: normalizedIds.map((id) => ({
      seatId: id,
      changes: {
        ...common,
        ...(individualById.get(id) || {}),
        venue: seatMap.venue,
        seatMap: seatMap._id,
      },
    })),
  };
};

const seatStructuralChanges = (seat, changes = {}) => {
  const normalized = normalizeSeatChanges(changes);
  const fields = ["seatMap", "venue", "label", "section", "row", "number"];
  return fields.filter((field) => {
    if (normalized[field] === undefined) return false;
    if (["seatMap", "venue"].includes(field)) return idOf(seat[field]) !== idOf(normalized[field]);
    return String(seat[field] ?? "") !== String(normalized[field] ?? "");
  });
};

const getSeatMapWarnings = async (seatMap) => {
  const warnings = [];
  const seats = await Seat.find({ seatMap: seatMap._id }).select(
    "_id venue section row number label x y width height isActive priceCategory companionSeat"
  );
  const errors = await validateSeatDocuments(seatMap, seats);
  const groupedErrors = new Map();
  errors.forEach((error) => {
    const current = groupedErrors.get(error.code) || [];
    current.push(error);
    groupedErrors.set(error.code, current);
  });
  groupedErrors.forEach((items, code) => {
    if (items.length === 1) {
      warnings.push(items[0]);
      return;
    }
    warnings.push(issue(
      "seats",
      code,
      `${items.length} problema sa sedištima. Primeri: ${items.slice(0, 3).map((item) => item.message).join(" ")}`,
      {
        count: items.length,
        sampleFields: items.slice(0, 3).map((item) => item.field),
      }
    ));
  });

  const activeSeats = seats.filter((seat) => seat.isActive).length;
  const configuredCapacity = (seatMap.sections || []).reduce(
    (sum, section) => sum + Number(section.capacity || 0),
    0
  );
  if (configuredCapacity && configuredCapacity !== activeSeats) {
    warnings.push(issue("sections", "capacity_mismatch", "Deklarisani kapacitet mape se ne podudara sa aktivnim sedištima.", {
      configuredCapacity,
      activeSeats,
    }));
  }
  return warnings;
};

const assertSeatMapCanBeDeleted = async (seatMap) => {
  const usage = await getSeatMapUsage(seatMap._id);
  if (usage.hasUsage) {
    throw conflictError("Korišćena mapa sedišta ne može biti fizički obrisana.", {
      usage,
      recommendation: "Arhivirajte mapu ili napravite njen duplikat za novi raspored.",
    });
  }
  return usage;
};

module.exports = {
  assertSeatMapCanBeDeleted,
  getSeatMapUsage,
  getSeatMapWarnings,
  getSeatUsage,
  normalizeSeatChanges,
  seatStructuralChanges,
  validateSeatBatchUpdate,
  validateSeatDocuments,
  validateSeatMapPayload,
};
