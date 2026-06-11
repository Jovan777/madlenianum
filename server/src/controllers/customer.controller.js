const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");

const Customer = require("../models/Customer");
const Order = require("../models/Order");

const signCustomerToken = (id) => {
  return jwt.sign(
    {
      id,
      type: "customer",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const sanitizeCustomer = (customer) => ({
  id: customer._id,
  fullName: customer.fullName,
  email: customer.email,
  address: customer.address,
  postalCode: customer.postalCode,
  city: customer.city,
  country: customer.country,
  phone: customer.phone,
  newsletterConsent: customer.newsletterConsent,
  language: customer.language,
  status: customer.status,
});

const register = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    address,
    postalCode,
    city,
    country,
    phone,
    newsletterConsent,
    language,
  } = req.body;

  if (!fullName || !email || !password) {
    res.status(400);
    throw new Error("Full name, email and password are required.");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingCustomer = await Customer.findOne({ email: normalizedEmail });

  if (existingCustomer) {
    res.status(400);
    throw new Error("Customer with this email already exists.");
  }

  const passwordHash = await Customer.hashPassword(password);

  const customer = await Customer.create({
    fullName,
    email: normalizedEmail,
    passwordHash,
    address,
    postalCode,
    city,
    country,
    phone,
    newsletterConsent: Boolean(newsletterConsent),
    language: language || "sr",
    status: "active",
  });

  res.status(201).json({
    success: true,
    token: signCustomerToken(customer._id),
    customer: sanitizeCustomer(customer),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required.");
  }

  const customer = await Customer.findOne({
    email: email.toLowerCase().trim(),
  }).select("+passwordHash");

  if (!customer) {
    res.status(401);
    throw new Error("Wrong email or password.");
  }

  const isPasswordValid = await customer.comparePassword(password);

  if (!isPasswordValid) {
    res.status(401);
    throw new Error("Wrong email or password.");
  }

  if (customer.status !== "active") {
    res.status(403);
    throw new Error("Customer account is blocked.");
  }

  customer.lastLoginAt = new Date();
  await customer.save();

  res.json({
    success: true,
    token: signCustomerToken(customer._id),
    customer: sanitizeCustomer(customer),
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    customer: sanitizeCustomer(req.customer),
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "fullName",
    "address",
    "postalCode",
    "city",
    "country",
    "phone",
    "newsletterConsent",
    "language",
  ];

  const customer = await Customer.findById(req.customer._id);

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found.");
  }

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      customer[field] = req.body[field];
    }
  });

  await customer.save();

  res.json({
    success: true,
    customer: sanitizeCustomer(customer),
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const items = await Order.find({ customer: req.customer._id })
    .populate({
      path: "event",
      populate: [
        { path: "production" },
        { path: "venue" },
      ],
    })
    .populate("items")
    .sort("-createdAt");

  res.json({
    success: true,
    items,
  });
});

const getMyOrderById = asyncHandler(async (req, res) => {
  const item = await Order.findOne({
    _id: req.params.id,
    customer: req.customer._id,
  })
    .populate({
      path: "event",
      populate: [
        { path: "production" },
        { path: "venue" },
      ],
    })
    .populate({
      path: "items",
      populate: [{ path: "seat" }, { path: "priceCategory" }],
    });

  if (!item) {
    res.status(404);
    throw new Error("Order not found.");
  }

  res.json({
    success: true,
    item,
  });
});

module.exports = {
  register,
  login,
  me,
  updateProfile,
  getMyOrders,
  getMyOrderById,
};