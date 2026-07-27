const express = require("express");
const {
  archiveRentalSpace,
  createRentalSpace,
  deleteRentalSpace,
  getRentalSpaceById,
  listRentalSpaces,
  previewRentalSpace,
  publishRentalSpace,
  updateRentalSpace,
} = require("../controllers/rental.controller");

const router = express.Router();

router.get("/", listRentalSpaces);
router.post("/", createRentalSpace);
router.get("/:id/preview", previewRentalSpace);
router.post("/:id/publish", publishRentalSpace);
router.patch("/:id/archive", archiveRentalSpace);
router.get("/:id", getRentalSpaceById);
router.patch("/:id", updateRentalSpace);
router.put("/:id", updateRentalSpace);
router.delete("/:id", deleteRentalSpace);

module.exports = router;
