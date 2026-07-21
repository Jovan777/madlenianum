const express = require("express");
const upload = require("../middleware/upload.middleware");
const {
  uploadFile,
  uploadMultipleFiles,
  listMedia,
  getMedia,
  updateMedia,
  getMediaUsage,
  deleteMedia,
} = require("../controllers/media.controller");

const router = express.Router();

router.get("/", listMedia);
router.post("/", upload.single("file"), uploadFile);
router.post("/multiple", upload.array("files", 20), uploadMultipleFiles);
router.get("/:id/usage", getMediaUsage);
router.get("/:id", getMedia);
router.patch("/:id", updateMedia);
router.delete("/:id", deleteMedia);

module.exports = router;
