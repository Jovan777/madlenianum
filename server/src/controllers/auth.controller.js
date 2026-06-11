const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const AdminUser = require("../models/AdminUser");

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
    res.status(401);
    throw new Error("Wrong email or password.");
  }

  const isPasswordValid = await admin.comparePassword(password);

  if (!isPasswordValid) {
    res.status(401);
    throw new Error("Wrong email or password.");
  }

  if (admin.status !== "active") {
    res.status(403);
    throw new Error("Admin account is blocked.");
  }

  admin.lastLoginAt = new Date();
  await admin.save();

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
