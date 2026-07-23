const express = require("express");

const {
  getSeatMaps,
  getSeatMapById,
  createSeatMap,
  updateSeatMap,
  deleteSeatMap,
  duplicateSeatMap,
  archiveSeatMap,
  bulkUpdateSeats,
  getSeatMapPreview,
} = require("../controllers/seatMap.controller");

const router = express.Router();

router.get("/", getSeatMaps);
router.post("/", createSeatMap);

router.get("/:id/preview", getSeatMapPreview);
router.post("/:id/duplicate", duplicateSeatMap);
router.post("/:id/actions/archive", archiveSeatMap);
router.patch("/:id/seats/bulk", bulkUpdateSeats);
router.get("/:id", getSeatMapById);
router.patch("/:id", updateSeatMap);
router.put("/:id", updateSeatMap);
router.delete("/:id", deleteSeatMap);

module.exports = router;
