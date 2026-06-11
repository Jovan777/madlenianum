const express = require("express");

const {
  getPricePlans,
  getPricePlanById,
  createPricePlan,
  updatePricePlan,
  deletePricePlan,
} = require("../controllers/pricePlan.controller");

const router = express.Router();

router.get("/", getPricePlans);
router.post("/", createPricePlan);

router.get("/:id", getPricePlanById);
router.patch("/:id", updatePricePlan);
router.put("/:id", updatePricePlan);
router.delete("/:id", deletePricePlan);

module.exports = router;