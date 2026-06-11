const express = require("express");

const {
  getEventFormOptions,
  getSeatMapFormOptions,
  getPricePlanFormOptions,
} = require("../controllers/adminFormOptions.controller");

const router = express.Router();

router.get("/event", getEventFormOptions);
router.get("/seat-map", getSeatMapFormOptions);
router.get("/price-plan", getPricePlanFormOptions);

module.exports = router;