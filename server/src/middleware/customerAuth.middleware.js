const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const Customer = require("../models/Customer");

const protectCustomer = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Customer authentication required.");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.type && decoded.type !== "customer") {
    res.status(401);
    throw new Error("Invalid customer token.");
  }

  const customer = await Customer.findById(decoded.id).select("-passwordHash");

  if (!customer) {
    res.status(401);
    throw new Error("Customer does not exist.");
  }

  if (customer.status !== "active") {
    res.status(403);
    throw new Error("Customer account is blocked.");
  }

  req.customer = customer;
  next();
});

module.exports = {
  protectCustomer,
};