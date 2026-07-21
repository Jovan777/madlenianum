const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String,
      default: "",
    },
    fileType: {
      type: String,
      enum: ["image", "document", "video", "other"],
      default: "other",
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    alt: {
      type: String,
      default: "",
    },
    caption: {
      type: String,
      default: "",
    },
    credit: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
    },
  },
  {
    timestamps: true,
  }
);

mediaSchema.virtual("altText")
  .get(function () {
    return this.alt || "";
  })
  .set(function (value) {
    this.alt = value || "";
  });

mediaSchema.set("toJSON", { virtuals: true });
mediaSchema.set("toObject", { virtuals: true });

mediaSchema.index({ fileType: 1, createdAt: -1 });
mediaSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Media", mediaSchema, "media");
