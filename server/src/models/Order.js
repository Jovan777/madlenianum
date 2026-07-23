const mongoose = require("mongoose");

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

const orderSchema = new mongoose.Schema(
  {
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
    sessionId: {
      type: String,
      default: "",
      trim: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
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
      enum: ["pending", "reserved", "paid", "cancelled", "expired", "refunded"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "cancelled", "refunded"],
      default: "unpaid",
    },
    paymentProvider: {
      type: String,
      enum: ["none", "internal", "legacy_php", "external", "manual"],
      default: "none",
    },
    expiresAt: Date,
    paidAt: Date,
    cancelledAt: Date,
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

module.exports = mongoose.model("Order", orderSchema, "orders");
