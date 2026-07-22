const express = require("express");

const {
  getPricePlans,
  getPricePlanById,
  createPricePlan,
  updatePricePlan,
  deletePricePlan,
  duplicatePricePlan,
  validatePricePlan,
  activatePricePlan,
  deactivatePricePlan,
  archivePricePlan,
} = require("../controllers/pricePlan.controller");

const router = express.Router();

router.get("/", getPricePlans);
router.post("/", createPricePlan);
router.post("/validate", validatePricePlan);

router.get("/:id", getPricePlanById);
router.post("/:id/validate", validatePricePlan);
router.post("/:id/duplicate", duplicatePricePlan);
router.post("/:id/actions/activate", activatePricePlan);
router.post("/:id/actions/deactivate", deactivatePricePlan);
router.post("/:id/actions/archive", archivePricePlan);
router.patch("/:id", updatePricePlan);
router.put("/:id", updatePricePlan);
router.delete("/:id", deletePricePlan);

module.exports = router;
