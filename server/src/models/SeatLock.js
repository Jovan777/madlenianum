const mongoose = require("mongoose");

const seatLockSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    sessionId: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "released", "converted", "expired"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

seatLockSchema.index(
  { event: 1, seat: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
    },
  }
);

seatLockSchema.index({ event: 1, sessionId: 1, status: 1 });
seatLockSchema.index({ event: 1, customer: 1, status: 1 });
seatLockSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("SeatLock", seatLockSchema, "seatlocks");