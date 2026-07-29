const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    locale: { type: String, enum: ["sr", "en"], default: "sr" },
    fullName: {
      type: String,
      required: [true, "Ime i prezime je obavezno."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email je obavezan."],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: [true, "Poruka je obavezna."],
    },
    sourcePage: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["new", "read", "answered", "archived"],
      default: "new",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema, "contact_messages");
