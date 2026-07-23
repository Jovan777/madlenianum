const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const Event = require("../models/Event");
const EventSeatOverride = require("../models/EventSeatOverride");
const Seat = require("../models/Seat");
const {
  EVENT_SEAT_OVERRIDE_LABELS,
  EVENT_SEAT_OVERRIDE_TYPES,
} = require("../constants/seatMap.constants");
const {
  adminSeatDto,
  calculateEffectiveSeatStates,
} = require("../services/effectiveSeatState.service");
const {
  conflictError,
  idOf,
  issue,
  validationError,
} = require("../services/ticketingConfiguration.service");

const populateEvent = [
  { path: "production", select: "title type slug" },
  { path: "venue", select: "name slug" },
  { path: "seatMap" },
  { path: "pricePlan", populate: "rules.priceCategory" },
];

const loadEvent = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw validationError("ID termina nije ispravan.", [
      issue("eventId", "invalid_object_id", "ID termina nije ispravan."),
    ]);
  }
  const event = await Event.findById(eventId).populate(populateEvent);
  if (!event) {
    const error = new Error("Termin nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  if (!event.seatMap) {
    throw conflictError("Termin nema mapu sedišta za upravljanje izuzecima.", {
      field: "seatMap",
    });
  }
  if (!["draft", "scheduled", "postponed"].includes(event.status)) {
    throw conflictError("Status termina ne dozvoljava izmenu izuzetaka sedišta.", {
      status: event.status,
    });
  }
  return event;
};

const validateSeatIds = async (event, seatIds) => {
  if (!Array.isArray(seatIds) || !seatIds.length) {
    throw validationError("Izaberite najmanje jedno sedište.", [
      issue("seatIds", "required", "Lista sedišta je obavezna."),
    ]);
  }
  const ids = seatIds.map(String);
  if (new Set(ids).size !== ids.length || ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw validationError("Lista sedišta nije ispravna.", [
      issue("seatIds", "invalid_or_duplicate_ids", "ID vrednosti moraju biti ispravne i jedinstvene."),
    ]);
  }
  const seats = await Seat.find({ _id: { $in: ids }, seatMap: event.seatMap._id });
  if (seats.length !== ids.length) {
    throw validationError("Neka sedišta ne pripadaju mapi ovog termina.", [
      issue("seatIds", "seat_map_mismatch", "Sva sedišta moraju pripadati mapi termina."),
    ]);
  }
  return seats;
};

const requireActiveSaleConfirmation = (event, body) => {
  if (event.saleStatus === "on_sale" && body.confirmActiveSale !== true) {
    throw conflictError("Termin je trenutno u prodaji. Potvrdite operativnu promenu sedišta.", {
      code: "active_sale_confirmation_required",
      confirmationField: "confirmActiveSale",
    });
  }
};

const assertSeatsCanBeOverridden = async (event, seats) => {
  const effective = await calculateEffectiveSeatStates(event, { seats });
  const conflicting = effective.items.filter((item) =>
    ["sold", "reserved", "locked"].includes(item.effectiveState)
  );
  if (conflicting.length) {
    throw conflictError("Prodato, rezervisano ili aktivno zaključano sedište ne može dobiti administrativni izuzetak.", {
      seats: conflicting.map((item) => ({
        seatId: String(item.seat._id),
        label: item.seat.label,
        state: item.effectiveState,
      })),
    });
  }
};

const overrideSummary = (overrides) => {
  const byType = Object.fromEntries(EVENT_SEAT_OVERRIDE_TYPES.map((type) => [type, 0]));
  overrides.filter((item) => item.active).forEach((item) => {
    byType[item.type] = (byType[item.type] || 0) + 1;
  });
  return {
    total: overrides.length,
    active: overrides.filter((item) => item.active).length,
    byType,
  };
};

const listEventSeatOverrides = asyncHandler(async (req, res) => {
  const event = await loadEvent(req.params.id);
  const overrides = await EventSeatOverride.find({ event: event._id })
    .populate("seat", "label section row number")
    .populate("createdBy", "username email")
    .populate("updatedBy", "username email")
    .sort("type createdAt");
  res.json({
    success: true,
    item: {
      event,
      overrides,
      summary: overrideSummary(overrides),
      overrideTypes: EVENT_SEAT_OVERRIDE_TYPES.map((value) => ({
        value,
        label: EVENT_SEAT_OVERRIDE_LABELS[value],
      })),
    },
  });
});

const getEventSeatPreview = asyncHandler(async (req, res) => {
  const event = await loadEvent(req.params.id);
  const effective = await calculateEffectiveSeatStates(event);
  res.json({
    success: true,
    item: {
      event,
      seats: effective.items.map(adminSeatDto),
      summary: {
        effectiveStates: effective.counts,
        overrides: overrideSummary(effective.overrides),
      },
      overrideTypes: EVENT_SEAT_OVERRIDE_TYPES.map((value) => ({
        value,
        label: EVENT_SEAT_OVERRIDE_LABELS[value],
      })),
    },
  });
});

const bulkUpsertOverrides = asyncHandler(async (req, res) => {
  const event = await loadEvent(req.params.id);
  requireActiveSaleConfirmation(event, req.body);
  if (!EVENT_SEAT_OVERRIDE_TYPES.includes(req.body.type)) {
    throw validationError("Tip izuzetka nije podržan.", [
      issue("type", "invalid_override_type", "Izaberite podržan tip izuzetka."),
    ]);
  }
  const seats = await validateSeatIds(event, req.body.seatIds);
  await assertSeatsCanBeOverridden(event, seats);

  const existing = await EventSeatOverride.find({
    event: event._id,
    seat: { $in: seats.map((seat) => seat._id) },
  });
  const conflicts = existing.filter((override) =>
    override.active && override.type !== req.body.type
  );
  if (conflicts.length && req.body.replaceExisting !== true) {
    throw conflictError("Neka sedišta već imaju drugi aktivan izuzetak.", {
      code: "override_replace_confirmation_required",
      confirmationField: "replaceExisting",
      conflicts: conflicts.map((override) => ({
        seatId: String(override.seat),
        existingType: override.type,
      })),
    });
  }

  const internalReason = String(req.body.internalReason || "").trim();
  const publicMessage = String(req.body.publicMessage || "").trim();
  const adminId = req.admin?._id;
  await EventSeatOverride.bulkWrite(
    seats.map((seat) => ({
      updateOne: {
        filter: { event: event._id, seat: seat._id },
        update: {
          $set: {
            seatMap: event.seatMap._id,
            type: req.body.type,
            internalReason,
            publicMessage,
            active: true,
            updatedBy: adminId,
          },
          $setOnInsert: {
            createdBy: adminId,
          },
        },
        upsert: true,
      },
    })),
    { ordered: true }
  );
  const items = await EventSeatOverride.find({
    event: event._id,
    seat: { $in: seats.map((seat) => seat._id) },
  }).populate("seat", "label section row number");
  res.json({ success: true, count: items.length, items });
});

const bulkRemoveOverrides = asyncHandler(async (req, res) => {
  const event = await loadEvent(req.params.id);
  requireActiveSaleConfirmation(event, req.body);
  const seats = await validateSeatIds(event, req.body.seatIds);
  const result = await EventSeatOverride.updateMany(
    {
      event: event._id,
      seat: { $in: seats.map((seat) => seat._id) },
      active: true,
    },
    {
      $set: {
        active: false,
        updatedBy: req.admin?._id,
      },
    }
  );
  res.json({ success: true, removedCount: result.modifiedCount });
});

const removeOverride = asyncHandler(async (req, res) => {
  const event = await loadEvent(req.params.id);
  requireActiveSaleConfirmation(event, req.body || {});
  if (!mongoose.Types.ObjectId.isValid(req.params.overrideId)) {
    throw validationError("ID izuzetka nije ispravan.", [
      issue("overrideId", "invalid_object_id", "ID izuzetka nije ispravan."),
    ]);
  }
  const override = await EventSeatOverride.findOne({
    _id: req.params.overrideId,
    event: event._id,
  });
  if (!override) {
    const error = new Error("Izuzetak nije pronađen.");
    error.statusCode = 404;
    throw error;
  }
  override.active = false;
  override.updatedBy = req.admin?._id;
  await override.save();
  res.json({ success: true, item: override });
});

const clearOverrideType = asyncHandler(async (req, res) => {
  const event = await loadEvent(req.params.id);
  requireActiveSaleConfirmation(event, req.body || {});
  if (!EVENT_SEAT_OVERRIDE_TYPES.includes(req.params.type)) {
    throw validationError("Tip izuzetka nije podržan.", [
      issue("type", "invalid_override_type", "Tip izuzetka nije podržan."),
    ]);
  }
  const result = await EventSeatOverride.updateMany(
    { event: event._id, type: req.params.type, active: true },
    { $set: { active: false, updatedBy: req.admin?._id } }
  );
  res.json({ success: true, removedCount: result.modifiedCount });
});

module.exports = {
  bulkRemoveOverrides,
  bulkUpsertOverrides,
  clearOverrideType,
  getEventSeatPreview,
  listEventSeatOverrides,
  removeOverride,
};
