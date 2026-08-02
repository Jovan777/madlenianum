const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const AdminAuditLog = require("../models/AdminAuditLog");

const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const listAdminAuditLogs = asyncHandler(async (req, res) => {
  const page = positiveInteger(req.query.page, 1);
  const limit = Math.min(positiveInteger(req.query.limit, 30), 100);
  const filter = {};
  if (req.query.action) filter.action = String(req.query.action).trim();
  if (req.query.entityType) filter.entityType = String(req.query.entityType).trim();
  if (req.query.admin) {
    if (!mongoose.isValidObjectId(req.query.admin)) {
      return res.status(400).json({
        success: false,
        message: "Administrator ID nije ispravan.",
        fields: { admin: "Administrator ID nije ispravan." },
      });
    }
    filter.admin = req.query.admin;
  }

  const [total, items] = await Promise.all([
    AdminAuditLog.countDocuments(filter),
    AdminAuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  const pages = Math.max(1, Math.ceil(total / limit));
  res.json({ success: true, items, pagination: { page, limit, total, pages } });
});

module.exports = { listAdminAuditLogs };
