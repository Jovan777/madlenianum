const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    production: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Production",
      required: [true, "Production is required."],
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: [true, "Venue is required."],
    },
    startsAt: {
      type: Date,
      required: [true, "Start date and time are required."],
    },
    endsAt: Date,
    isPremiere: {
      type: Boolean,
      default: false,
    },
    badge: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "cancelled", "postponed", "finished"],
      default: "scheduled",
    },
    saleStatus: {
      type: String,
      enum: ["not_on_sale", "on_sale", "sold_out", "sales_closed", "free"],
      default: "not_on_sale",
    },

    seatMap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeatMap",
    },
    pricePlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PricePlan",
    },
    saleStartsAt: Date,
    saleEndsAt: Date,
    maxTicketsPerOrder: {
      type: Number,
      default: 4,
    },
    lockDurationMinutes: {
      type: Number,
      default: 15,
    },

    ticketing: {
      enabled: {
        type: Boolean,
        default: false,
      },
      provider: {
        type: String,
        enum: ["internal", "legacy_php", "external", "manual"],
        default: "manual",
      },
      legacyEventId: {
        type: String,
        default: "",
      },
      externalCheckoutUrl: {
        type: String,
        default: "",
      },
      note: {
        type: String,
        default: "",
      },
    },

    basePrice: {
      amount: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "RSD",
      },
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

eventSchema.index({ startsAt: 1 });
eventSchema.index({ production: 1, startsAt: 1 });
eventSchema.index({ seatMap: 1 });
eventSchema.index({ pricePlan: 1 });

module.exports = mongoose.model("Event", eventSchema, "events");