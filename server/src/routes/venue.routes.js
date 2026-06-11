const express = require("express");

const {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
} = require("../controllers/venue.controller");

const router = express.Router();

router.get("/", getVenues);
router.post("/", createVenue);

router.get("/:id", getVenueById);
router.patch("/:id", updateVenue);
router.put("/:id", updateVenue);
router.delete("/:id", deleteVenue);

module.exports = router;