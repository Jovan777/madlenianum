const express = require("express");

const {
  getSeats,
  getSeatById,
  createSeat,
  createManySeats,
  updateSeat,
  deleteSeat,
} = require("../controllers/seat.controller");

const router = express.Router();

router.get("/", getSeats);
router.post("/", createSeat);
router.post("/bulk", createManySeats);

router.get("/:id", getSeatById);
router.patch("/:id", updateSeat);
router.put("/:id", updateSeat);
router.delete("/:id", deleteSeat);

module.exports = router;