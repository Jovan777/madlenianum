const asyncHandler = require("../utils/asyncHandler");
const Customer = require("../models/Customer");

const getCustomers = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) filter.status = req.query.status;

  if (req.query.q) {
    filter.$or = [
      { fullName: new RegExp(req.query.q, "i") },
      { email: new RegExp(req.query.q, "i") },
      { phone: new RegExp(req.query.q, "i") },
      { city: new RegExp(req.query.q, "i") },
    ];
  }

  const items = await Customer.find(filter)
    .select("-passwordHash")
    .sort("-createdAt");

  res.json({
    success: true,
    items,
  });
});

const getCustomerById = asyncHandler(async (req, res) => {
  const item = await Customer.findById(req.params.id).select("-passwordHash");

  if (!item) {
    res.status(404);
    throw new Error("Customer not found.");
  }

  res.json({
    success: true,
    item,
  });
});

const updateCustomer = asyncHandler(async (req, res) => {
  const item = await Customer.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Customer not found.");
  }

  const allowedFields = [
    "fullName",
    "address",
    "postalCode",
    "city",
    "country",
    "phone",
    "newsletterConsent",
    "language",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  });

  await item.save();

  res.json({
    success: true,
    item,
  });
});

module.exports = {
  getCustomers,
  getCustomerById,
  updateCustomer,
};