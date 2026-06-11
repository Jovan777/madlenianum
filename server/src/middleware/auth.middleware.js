const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const AdminUser = require("../models/AdminUser");

const protectAdmin = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Authentication required.");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const admin = await AdminUser.findById(decoded.id).select("-passwordHash");

  if (!admin) {
    res.status(401);
    throw new Error("Admin user does not exist.");
  }

  if (admin.status !== "active") {
    res.status(403);
    throw new Error("Admin user is not active.");
  }

  req.admin = admin;
  next();
});

module.exports = {
  protectAdmin,
};
