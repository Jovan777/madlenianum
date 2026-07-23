const mongoose = require("mongoose");
const {
  EVENT_SEAT_OVERRIDE_TYPES,
} = require("../constants/seatMap.constants");

const eventSeatOverrideSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    seatMap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeatMap",
      required: true,
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },
    type: {
      type: String,
      enum: EVENT_SEAT_OVERRIDE_TYPES,
      required: true,
    },
    internalReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    publicMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
    },
  },
  {
    timestamps: true,
  }
);

eventSeatOverrideSchema.index({ event: 1, seat: 1 }, { unique: true });
eventSeatOverrideSchema.index({ event: 1, type: 1, active: 1 });
eventSeatOverrideSchema.index({ seatMap: 1, seat: 1 });

module.exports = mongoose.model(
  "EventSeatOverride",
  eventSeatOverrideSchema,
  "eventseatoverrides"
);
