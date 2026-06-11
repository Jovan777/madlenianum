const mongoose = require("mongoose");

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email je obavezan."],
      trim: true,
      lowercase: true,
      unique: true,
    },
    fullName: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      enum: ["sr", "en"],
      default: "sr",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "unsubscribed"],
      default: "active",
    },
    source: {
      type: String,
      enum: ["website", "admin", "import", "checkout"],
      default: "website",
    },
    consentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema, "newsletter_subscribers");
