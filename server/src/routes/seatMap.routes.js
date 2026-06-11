const express = require("express");

const {
  getSeatMaps,
  getSeatMapById,
  createSeatMap,
  updateSeatMap,
  deleteSeatMap,
} = require("../controllers/seatMap.controller");

const router = express.Router();

router.get("/", getSeatMaps);
router.post("/", createSeatMap);

router.get("/:id", getSeatMapById);
router.patch("/:id", updateSeatMap);
router.put("/:id", updateSeatMap);
router.delete("/:id", deleteSeatMap);

module.exports = router;