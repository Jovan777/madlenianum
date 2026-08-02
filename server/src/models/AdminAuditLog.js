const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", index: true },
  adminIdentity: {
    username: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
  },
  action: { type: String, required: true, trim: true, index: true },
  entityType: { type: String, required: true, trim: true, index: true },
  entityId: { type: String, trim: true, default: "", index: true },
  method: { type: String, trim: true, default: "" },
  path: { type: String, trim: true, default: "" },
  statusCode: { type: Number, default: 0 },
  summary: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  ip: { type: String, trim: true, default: "" },
  userAgent: { type: String, trim: true, default: "" },
}, { timestamps: { createdAt: true, updatedAt: false } });

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema, "admin_audit_logs");
