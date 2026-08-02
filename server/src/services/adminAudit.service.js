const AdminAuditLog = require("../models/AdminAuditLog");

const SAFE_BODY_KEYS = [
  "status", "saleStatus", "title", "name", "slug", "code", "action",
  "isFeatured", "isPremiere", "displayOrder", "reason",
];

const safeSummaryFromBody = (body = {}) => Object.fromEntries(
  SAFE_BODY_KEYS
    .filter((key) => Object.prototype.hasOwnProperty.call(body, key))
    .map((key) => [key, typeof body[key] === "string" ? body[key].slice(0, 200) : body[key]])
);

const recordAdminAudit = async ({
  admin,
  action,
  entityType,
  entityId = "",
  method = "",
  path = "",
  statusCode = 0,
  summary = {},
  ip = "",
  userAgent = "",
}) => {
  try {
    await AdminAuditLog.create({
      admin: admin?._id,
      adminIdentity: {
        username: admin?.username || "",
        email: admin?.email || "",
      },
      action,
      entityType,
      entityId: String(entityId || ""),
      method,
      path: String(path || "").slice(0, 300),
      statusCode,
      summary,
      ip: String(ip || "").slice(0, 100),
      userAgent: String(userAgent || "").slice(0, 300),
    });
  } catch (error) {
    console.error("Admin audit write failed:", error.message);
  }
};

const inferAuditAction = (method, path) => {
  if (path.includes("/publish")) return "publish";
  if (path.includes("/archive")) return "archive";
  if (path.includes("/duplicate")) return "duplicate";
  if (path.includes("/close-sale")) return "close_sale";
  if (path.includes("/cancel")) return "cancel";
  if (path.includes("/mark-paid")) return "mark_paid";
  if (path.includes("/resend")) return "resend_email";
  if (method === "POST") return "create";
  if (["PATCH", "PUT"].includes(method)) return "update";
  if (method === "DELETE") return "delete";
  return method.toLowerCase();
};

const inferEntityType = (path) => {
  const clean = String(path || "").split("?")[0];
  const segment = clean.split("/").filter(Boolean)[2] || "admin";
  return segment.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

module.exports = {
  inferAuditAction,
  inferEntityType,
  recordAdminAudit,
  safeSummaryFromBody,
};
