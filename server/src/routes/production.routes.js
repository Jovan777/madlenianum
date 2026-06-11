const express = require("express");

const {
  getProductions,
  getProductionById,
  createProduction,
  updateProduction,
  deleteProduction,
} = require("../controllers/production.controller");

const router = express.Router();

router.get("/", getProductions);
router.post("/", createProduction);

router.get("/:id", getProductionById);
router.patch("/:id", updateProduction);
router.put("/:id", updateProduction);
router.delete("/:id", deleteProduction);

module.exports = router;