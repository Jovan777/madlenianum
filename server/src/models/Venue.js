const mongoose = require("mongoose");
const slugify = require("../utils/slugify");

const translationSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
  },
  { _id: false }
);

const venueSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      default: 0,
    },
    isNumbered: {
      type: Boolean,
      default: true,
    },
    description: String,
  },
  { _id: false }
);

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Naziv scene/prostora je obavezan."],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    venueType: {
      type: String,
      enum: ["stage", "hall", "foyer", "salon", "other"],
      default: "stage",
    },
    capacity: {
      type: Number,
      default: 0,
    },
    hasNumberedSeats: {
      type: Boolean,
      default: true,
    },
    sections: [venueSectionSchema],
    description: {
      type: String,
      default: "",
    },
    images: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    translations: {
      sr: translationSchema,
      en: translationSchema,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
    weight: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

venueSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  next();
});

module.exports = mongoose.model("Venue", venueSchema, "venues");