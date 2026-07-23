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
const {
  bulkRemoveOverrides,
  bulkUpsertOverrides,
  clearOverrideType,
  getEventSeatPreview,
  listEventSeatOverrides,
  removeOverride,
} = require("../controllers/eventSeatOverride.controller");

const router = express.Router();

router.get("/", getEvents);
router.post("/", createEvent);
router.post("/validate", validateEvent);

router.get("/:id", getEventById);
router.get("/:id/ticketing-summary", getEventTicketingSummary);
router.get("/:id/seat-overrides", listEventSeatOverrides);
router.get("/:id/seat-map-preview", getEventSeatPreview);
router.post("/:id/seat-overrides/bulk", bulkUpsertOverrides);
router.delete("/:id/seat-overrides/bulk", bulkRemoveOverrides);
router.delete("/:id/seat-overrides/type/:type", clearOverrideType);
router.delete("/:id/seat-overrides/:overrideId", removeOverride);
router.post("/:id/validate", validateEvent);
router.post("/:id/duplicate", duplicateEvent);
router.post("/:id/actions/close-sale", closeEventSale);
router.post("/:id/actions/cancel", cancelEvent);
router.post("/:id/actions/archive", archiveEvent);

router.patch("/:id", updateEvent);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

module.exports = router;
