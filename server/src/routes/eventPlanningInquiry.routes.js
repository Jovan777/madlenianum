const express = require("express");
const {
  getEventPlanningInquiryById,
  listEventPlanningInquiries,
  resendEventPlanningInquiry,
  updateEventPlanningInquiryNotes,
  updateEventPlanningInquiryStatus,
} = require("../controllers/rental.controller");

const router = express.Router();

router.get("/", listEventPlanningInquiries);
router.get("/:id", getEventPlanningInquiryById);
router.post("/:id/resend", resendEventPlanningInquiry);
router.patch("/:id/status", updateEventPlanningInquiryStatus);
router.put("/:id/status", updateEventPlanningInquiryStatus);
router.patch("/:id/notes", updateEventPlanningInquiryNotes);
router.put("/:id/notes", updateEventPlanningInquiryNotes);

module.exports = router;
