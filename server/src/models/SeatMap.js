const mongoose = require("mongoose");
const slugify = require("../utils/slugify");

const seatMapSectionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: "",
    },
    // izbaciti
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const seatMapSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: [true, "Venue is required."],
    },
    name: {
      type: String,
      required: [true, "Seat map name is required."],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
    },
    canvas: {
      width: {
        type: Number,
        default: 1200,
      },
      height: {
        type: Number,
        default: 800,
      },
    },
    sections: [seatMapSectionSchema],
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  }
);

seatMapSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  next();
});

seatMapSchema.index({ venue: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model("SeatMap", seatMapSchema, "seatmaps");