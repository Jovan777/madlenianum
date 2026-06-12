const mongoose = require("mongoose");
const slugify = require("../utils/slugify");

const translationSchema = new mongoose.Schema(
  {
    displayName: String,
    biography: String,
    seoTitle: String,
    seoDescription: String,
  },
  { _id: false }
);

const artistSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: [true, "Ime i prezime umetnika je obavezno."],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    professions: [
      {
        type: String,
        trim: true,
      },
    ],
    biography: {
      type: String,
      default: "",
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },
    gallery: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    links: [
      {
        label: String,
        url: String,
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
    weight: { // izbaciti
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

artistSchema.pre("validate", function (next) {
  if (!this.slug && this.displayName) {
    this.slug = slugify(this.displayName);
  }

  next();
});

module.exports = mongoose.model("Artist", artistSchema, "artists");
