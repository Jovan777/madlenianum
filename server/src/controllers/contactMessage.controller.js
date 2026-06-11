const asyncHandler = require("../utils/asyncHandler");
const ContactMessage = require("../models/ContactMessage");

const getContactMessages = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.status) filter.status = req.query.status;

  if (req.query.q) {
    filter.$or = [
      { fullName: new RegExp(req.query.q, "i") },
      { email: new RegExp(req.query.q, "i") },
      { subject: new RegExp(req.query.q, "i") },
      { message: new RegExp(req.query.q, "i") },
    ];
  }

  const total = await ContactMessage.countDocuments(filter);

  const messages = await ContactMessage.find(filter)
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: messages,
  });
});

const getContactMessageById = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error("Kontakt poruka nije pronađena.");
  }

  res.json({
    success: true,
    item: message,
  });
});

const updateContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error("Kontakt poruka nije pronađena.");
  }

  Object.assign(message, req.body);
  await message.save();

  res.json({
    success: true,
    item: message,
  });
});

const deleteContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error("Kontakt poruka nije pronađena.");
  }

  await message.deleteOne();

  res.json({
    success: true,
    message: "Kontakt poruka je obrisana.",
  });
});

module.exports = {
  getContactMessages,
  getContactMessageById,
  updateContactMessage,
  deleteContactMessage,
};