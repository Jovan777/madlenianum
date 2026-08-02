const {
  inferAuditAction,
  inferEntityType,
  recordAdminAudit,
  safeSummaryFromBody,
} = require("../services/adminAudit.service");

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const adminAuditTrail = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();

  let responseEntityId = "";
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    responseEntityId = payload?.item?._id || payload?.item?.id || payload?.order?.id || "";
    return originalJson(payload);
  };

  res.once("finish", () => {
    const path = req.originalUrl || req.url;
    void recordAdminAudit({
      admin: req.admin,
      action: inferAuditAction(req.method, path),
      entityType: inferEntityType(path),
      entityId: req.params?.id || responseEntityId,
      method: req.method,
      path,
      statusCode: res.statusCode,
      summary: safeSummaryFromBody(req.body),
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });
  return next();
};

module.exports = { adminAuditTrail };
