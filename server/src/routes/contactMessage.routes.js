const express = require("express");

const {
  getContactMessages,
  getContactMessageById,
  updateContactMessage,
  deleteContactMessage,
} = require("../controllers/contactMessage.controller");

const router = express.Router();

router.get("/", getContactMessages);

router.get("/:id", getContactMessageById);
router.patch("/:id", updateContactMessage);
router.put("/:id", updateContactMessage);
router.delete("/:id", deleteContactMessage);

module.exports = router;