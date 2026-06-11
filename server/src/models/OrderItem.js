const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
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
    seatLabel: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      default: "",
      trim: true,
    },
    row: {
      type: String,
      default: "",
      trim: true,
    },
    number: {
      type: Number,
    },
    priceCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PriceCategory",
    },
    priceCategoryCode: {
      type: String,
      default: "",
      trim: true,
    },
    priceCategoryName: {
      type: String,
      default: "",
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
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
      enum: ["pending", "reserved", "paid", "cancelled", "refunded"],
      default: "reserved",
    },
  },
  {
    timestamps: true,
  }
);

orderItemSchema.index({ event: 1, seat: 1, status: 1 });
orderItemSchema.index({ order: 1 });

module.exports = mongoose.model("OrderItem", orderItemSchema, "orderitems");