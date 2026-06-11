const express = require("express");

const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventTicketingSummary,
} = require("../controllers/event.controller");

const router = express.Router();

router.get("/", getEvents);
router.post("/", createEvent);

router.get("/:id", getEventById);
router.get("/:id/ticketing-summary", getEventTicketingSummary);

router.patch("/:id", updateEvent);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

module.exports = router;