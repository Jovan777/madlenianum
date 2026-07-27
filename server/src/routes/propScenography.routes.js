const express = require("express");
const {
  archivePropScenography,
  createPropScenography,
  deletePropScenography,
  getPropScenographyById,
  listPropScenography,
  previewPropScenography,
  publishPropScenography,
  updatePropScenography,
} = require("../controllers/fundus.controller");

const router = express.Router();

router.get("/", listPropScenography);
router.post("/", createPropScenography);
router.get("/:id/preview", previewPropScenography);
router.post("/:id/publish", publishPropScenography);
router.patch("/:id/archive", archivePropScenography);
router.get("/:id", getPropScenographyById);
router.patch("/:id", updatePropScenography);
router.put("/:id", updatePropScenography);
router.delete("/:id", deletePropScenography);

module.exports = router;
