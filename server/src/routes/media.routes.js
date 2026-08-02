const express = require("express");
const upload = require("../middleware/upload.middleware");
const { uploadLimiter } = require("../middleware/securityLimits.middleware");
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
router.post("/", uploadLimiter, upload.single("file"), uploadFile);
router.post("/multiple", uploadLimiter, upload.array("files"), uploadMultipleFiles);
router.get("/:id/usage", getMediaUsage);
router.get("/:id", getMedia);
router.patch("/:id", updateMedia);
router.delete("/:id", deleteMedia);

module.exports = router;
