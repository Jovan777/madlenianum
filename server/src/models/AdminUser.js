const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Korisničko ime je obavezno."],
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: [true, "Email je obavezan."],
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["administrator", "editor"],
      default: "editor",
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    language: {
      type: String,
      enum: ["sr", "en"],
      default: "sr",
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  }
);

adminUserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

adminUserSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model("AdminUser", adminUserSchema, "adminusers");
