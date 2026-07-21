const express = require("express");

const {
  getPromoSlides,
  getPromoSlideById,
  createPromoSlide,
  updatePromoSlide,
  deletePromoSlide,
  archivePromoSlide,
  previewPromoSlide,
} = require("../controllers/promoSlide.controller");

const router = express.Router();

router.get("/", getPromoSlides);
router.post("/", createPromoSlide);

router.get("/:id/preview", previewPromoSlide);
router.patch("/:id/archive", archivePromoSlide);
router.get("/:id", getPromoSlideById);
router.patch("/:id", updatePromoSlide);
router.put("/:id", updatePromoSlide);
router.delete("/:id", deletePromoSlide);

module.exports = router;
