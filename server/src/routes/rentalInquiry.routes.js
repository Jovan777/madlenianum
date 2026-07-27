const express = require("express");
const {
  getRentalInquiryById,
  listRentalInquiries,
  resendRentalInquiry,
  updateRentalInquiryNotes,
  updateRentalInquiryStatus,
} = require("../controllers/rental.controller");

const router = express.Router();

router.get("/", listRentalInquiries);
router.get("/:id", getRentalInquiryById);
router.post("/:id/resend", resendRentalInquiry);
router.patch("/:id/status", updateRentalInquiryStatus);
router.put("/:id/status", updateRentalInquiryStatus);
router.patch("/:id/notes", updateRentalInquiryNotes);
router.put("/:id/notes", updateRentalInquiryNotes);

module.exports = router;
