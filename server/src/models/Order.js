const mongoose = require("mongoose");
const {
  EMAIL_STATUSES,
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_STATUSES,
} = require("../constants/order.constants");

const customerSnapshotSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: "",
      trim: true,
    },
    lastName: {
      type: String,
      default: "",
      trim: true,
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const eventSnapshotSchema = new mongoose.Schema(
  {
    productionId: mongoose.Schema.Types.ObjectId,
    productionTitle: { type: String, default: "", trim: true },
    eventStartsAt: Date,
    eventEndsAt: Date,
    venueId: mongoose.Schema.Types.ObjectId,
    venueName: { type: String, default: "", trim: true },
    venueStage: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const emailDeliverySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: EMAIL_STATUSES,
      default: "pending",
    },
    messageType: {
      type: String,
      enum: ["reservation", "pending_payment", "paid", "cancelled", "expired"],
      default: "reservation",
    },
    sentAt: Date,
    lastAttemptAt: Date,
    lastError: { type: String, default: "", trim: true },
    resendCount: { type: Number, default: 0, min: 0 },
    lastResendAt: Date,
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: { type: String, default: "", trim: true },
    toStatus: { type: String, required: true, trim: true },
    reason: { type: String, default: "", trim: true },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
    },
    source: {
      type: String,
      enum: ["public", "admin", "system", "migration"],
      default: "system",
    },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    locale: { type: String, enum: ["sr", "en"], default: "sr", index: true },
    orderCode: {
      type: String,
      unique: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerSnapshot: customerSnapshotSchema,
    orderType: {
      type: String,
      enum: ORDER_TYPES,
      default: "reservation",
    },
    sessionId: {
      type: String,
      default: "",
      trim: true,
      select: false,
    },
    idempotencyKey: {
      type: String,
      default: undefined,
      trim: true,
      select: false,
    },
    publicAccessTokenHash: {
      type: String,
      default: undefined,
      select: false,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    eventSnapshot: eventSnapshotSchema,
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderItem",
      },
    ],
    subtotalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "RSD",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "unpaid",
    },
    paymentProvider: {
      type: String,
      enum: ["none", "internal", "legacy_php", "external", "manual"],
      default: "none",
    },
    expiresAt: Date,
    reservationExpiresAt: Date,
    paymentExpiresAt: Date,
    paidAt: Date,
    cancelledAt: Date,
    expiredAt: Date,
    emailDelivery: {
      type: emailDeliverySchema,
      default: () => ({}),
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre("validate", function () {
  if (!this.orderCode) {
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.orderCode = `MDL-${Date.now()}-${randomPart}`;
  }
});

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ event: 1, status: 1 });
orderSchema.index({ sessionId: 1 });
orderSchema.index({ expiresAt: 1 });
orderSchema.index({ reservationExpiresAt: 1 });
orderSchema.index({ paymentExpiresAt: 1 });
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
orderSchema.index({ publicAccessTokenHash: 1 }, { sparse: true });
orderSchema.index({ "customerSnapshot.email": 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema, "orders");
