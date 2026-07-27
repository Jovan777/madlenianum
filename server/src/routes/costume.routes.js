const express = require("express");
const {
  archiveCostume,
  createCostume,
  deleteCostume,
  getCostumeById,
  listCostumes,
  previewCostume,
  publishCostume,
  updateCostume,
} = require("../controllers/fundus.controller");

const router = express.Router();

router.get("/", listCostumes);
router.post("/", createCostume);
router.get("/:id/preview", previewCostume);
router.post("/:id/publish", publishCostume);
router.patch("/:id/archive", archiveCostume);
router.get("/:id", getCostumeById);
router.patch("/:id", updateCostume);
router.put("/:id", updateCostume);
router.delete("/:id", deleteCostume);

module.exports = router;
