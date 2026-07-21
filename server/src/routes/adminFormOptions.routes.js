const express = require("express");

const {
  getEventFormOptions,
  getProductionFormOptions,
  getArtistFormOptions,
  getSeatMapFormOptions,
  getPricePlanFormOptions,
  getNewsFormOptions,
  getHomepageFormOptions,
  getPromoSlideFormOptions,
} = require("../controllers/adminFormOptions.controller");

const router = express.Router();

router.get("/event", getEventFormOptions);
router.get("/production", getProductionFormOptions);
router.get("/artist", getArtistFormOptions);
router.get("/seat-map", getSeatMapFormOptions);
router.get("/price-plan", getPricePlanFormOptions);
router.get("/news", getNewsFormOptions);
router.get("/homepage", getHomepageFormOptions);
router.get("/promo-slide", getPromoSlideFormOptions);

module.exports = router;
