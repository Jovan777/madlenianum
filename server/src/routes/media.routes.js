const express = require("express");
const upload = require("../middleware/upload.middleware");
const {
  uploadFile,
  listMedia,
  deleteMedia,
} = require("../controllers/media.controller");

const router = express.Router();

router.get("/", listMedia);
router.post("/", upload.single("file"), uploadFile);
router.delete("/:id", deleteMedia);

module.exports = router;