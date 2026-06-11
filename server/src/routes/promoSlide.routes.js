const express = require("express");

const {
  getPromoSlides,
  getPromoSlideById,
  createPromoSlide,
  updatePromoSlide,
  deletePromoSlide,
} = require("../controllers/promoSlide.controller");

const router = express.Router();

router.get("/", getPromoSlides);
router.post("/", createPromoSlide);

router.get("/:id", getPromoSlideById);
router.patch("/:id", updatePromoSlide);
router.put("/:id", updatePromoSlide);
router.delete("/:id", deletePromoSlide);

module.exports = router;