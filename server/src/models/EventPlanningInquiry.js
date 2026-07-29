const mongoose = require("mongoose");
const {
  INQUIRY_EMAIL_STATUSES,
  INQUIRY_STATUSES,
} = require("../constants/phase6a.constants");

const inquiryEmailDeliverySchema = new mongoose.Schema(
  {
    status: { type: String, enum: INQUIRY_EMAIL_STATUSES, default: "pending" },
    sentAt: Date,
    lastAttemptAt: Date,
    lastError: { type: String, trim: true, default: "" },
    resendCount: { type: Number, min: 0, default: 0 },
    lastResendAt: Date,
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: { type: String, trim: true, default: "" },
    toStatus: { type: String, enum: INQUIRY_STATUSES, required: true },
    reason: { type: String, trim: true, default: "" },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    source: { type: String, enum: ["public", "admin", "system", "seed"], default: "system" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const eventPlanningInquirySchema = new mongoose.Schema(
  {
    locale: { type: String, enum: ["sr", "en"], default: "sr" },
    referenceNumber: { type: String, unique: true, trim: true },
    firstName: { type: String, required: [true, "Ime je obavezno."], trim: true },
    lastName: { type: String, required: [true, "Prezime je obavezno."], trim: true },
    companyName: { type: String, trim: true, default: "" },
    email: { type: String, required: [true, "Email je obavezan."], lowercase: true, trim: true },
    phone: { type: String, required: [true, "Telefon je obavezan."], trim: true },
    desiredDate: Date,
    approximateGuestCount: { type: Number, min: 0 },
    preferredRentalSpace: { type: mongoose.Schema.Types.ObjectId, ref: "RentalSpace" },
    preferredRentalSpaceSnapshot: {
      title: { type: String, trim: true, default: "" },
      slug: { type: String, trim: true, default: "" },
    },
    eventType: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    status: { type: String, enum: INQUIRY_STATUSES, default: "new" },
    internalNotes: { type: String, trim: true, default: "" },
    statusHistory: { type: [statusHistorySchema], default: [] },
    emailDelivery: { type: inquiryEmailDeliverySchema, default: () => ({}) },
    idempotencyKey: { type: String, trim: true, default: undefined, select: false },
  },
  { timestamps: true }
);

eventPlanningInquirySchema.pre("validate", function () {
  if (!this.referenceNumber) {
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.referenceNumber = `EVP-${Date.now()}-${randomPart}`;
  }
  if (this.email) this.email = String(this.email).trim().toLowerCase();
});

eventPlanningInquirySchema.index({ status: 1, createdAt: -1 });
eventPlanningInquirySchema.index({ preferredRentalSpace: 1, status: 1 });
eventPlanningInquirySchema.index({ email: 1, createdAt: -1 });
eventPlanningInquirySchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("EventPlanningInquiry", eventPlanningInquirySchema, "eventplanninginquiries");
