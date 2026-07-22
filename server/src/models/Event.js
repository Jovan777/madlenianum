const mongoose = require("mongoose");
const {
  EVENT_STATUSES,
  LEGACY_EVENT_STATUS_MAP,
  LEGACY_SALE_STATUS_MAP,
  SALE_STATUSES,
  TICKETING_PROVIDERS,
  normalizeEventStatus,
  normalizeSaleStatus,
} = require("../constants/ticketing.constants");

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
      enum: [...EVENT_STATUSES, ...Object.keys(LEGACY_EVENT_STATUS_MAP)],
      default: "draft",
    },
    saleStatus: {
      type: String,
      enum: [...SALE_STATUSES, ...Object.keys(LEGACY_SALE_STATUS_MAP)],
      default: "not_started",
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
        enum: TICKETING_PROVIDERS,
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

eventSchema.pre("validate", function () {
  this.status = normalizeEventStatus(this.status);
  this.saleStatus = normalizeSaleStatus(this.saleStatus);
});

module.exports = mongoose.model("Event", eventSchema, "events");
