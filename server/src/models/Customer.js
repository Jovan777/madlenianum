const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    // Optional fields for customer profile
    address: {
      type: String,
      default: "",
      trim: true,
    },
    postalCode: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "Srbija",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    newsletterConsent: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      enum: ["sr", "en"],
      default: "sr",
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  }
);

customerSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

customerSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model("Customer", customerSchema, "customers");