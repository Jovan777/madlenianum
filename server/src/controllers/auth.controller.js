const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const AdminUser = require("../models/AdminUser");
const { recordAdminAudit } = require("../services/adminAudit.service");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required.");
  }

  const admin = await AdminUser.findOne({
    email: email.toLowerCase().trim(),
  }).select("+passwordHash");

  if (!admin) {
    await recordAdminAudit({
      action: "login_failed", entityType: "adminAuth", method: req.method,
      path: req.originalUrl, statusCode: 401, summary: { reason: "invalid_credentials" },
      ip: req.ip, userAgent: req.get("user-agent"),
    });
    res.status(401);
    throw new Error("Wrong email or password.");
  }

  const isPasswordValid = await admin.comparePassword(password);

  if (!isPasswordValid) {
    await recordAdminAudit({
      admin, action: "login_failed", entityType: "adminAuth", entityId: admin._id,
      method: req.method, path: req.originalUrl, statusCode: 401,
      summary: { reason: "invalid_credentials" }, ip: req.ip, userAgent: req.get("user-agent"),
    });
    res.status(401);
    throw new Error("Wrong email or password.");
  }

  if (admin.status !== "active") {
    await recordAdminAudit({
      admin, action: "login_blocked", entityType: "adminAuth", entityId: admin._id,
      method: req.method, path: req.originalUrl, statusCode: 403,
      summary: { reason: "inactive_admin" }, ip: req.ip, userAgent: req.get("user-agent"),
    });
    res.status(403);
    throw new Error("Admin account is blocked.");
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  await recordAdminAudit({
    admin, action: "login_success", entityType: "adminAuth", entityId: admin._id,
    method: req.method, path: req.originalUrl, statusCode: 200,
    ip: req.ip, userAgent: req.get("user-agent"),
  });

  res.json({
    success: true,
    token: signToken(admin._id),
    admin: {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      language: admin.language,
    },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    admin: req.admin,
  });
});

module.exports = {
  login,
  me,
};
