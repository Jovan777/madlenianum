const express = require("express");

const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  duplicateEvent,
  getEventTicketingSummary,
  validateEvent,
  closeEventSale,
  cancelEvent,
  archiveEvent,
} = require("../controllers/event.controller");

const router = express.Router();

router.get("/", getEvents);
router.post("/", createEvent);
router.post("/validate", validateEvent);

router.get("/:id", getEventById);
router.get("/:id/ticketing-summary", getEventTicketingSummary);
router.post("/:id/validate", validateEvent);
router.post("/:id/duplicate", duplicateEvent);
router.post("/:id/actions/close-sale", closeEventSale);
router.post("/:id/actions/cancel", cancelEvent);
router.post("/:id/actions/archive", archiveEvent);

router.patch("/:id", updateEvent);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

module.exports = router;
