const express = require("express");

const {
  getPriceCategories,
  getPriceCategoryById,
  createPriceCategory,
  updatePriceCategory,
  deletePriceCategory,
} = require("../controllers/priceCategory.controller");

const router = express.Router();

router.get("/", getPriceCategories);
router.post("/", createPriceCategory);

router.get("/:id", getPriceCategoryById);
router.patch("/:id", updatePriceCategory);
router.put("/:id", updatePriceCategory);
router.delete("/:id", deletePriceCategory);

module.exports = router;