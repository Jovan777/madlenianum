const express = require("express");

const {
  getStaticPages,
  getStaticPageById,
  createStaticPage,
  updateStaticPage,
  deleteStaticPage,
  getStructuredPage,
  updateStructuredPage,
  previewStructuredPage,
  previewStaticPage,
  archiveStaticPage,
} = require("../controllers/staticPage.controller");

const router = express.Router();

router.get("/", getStaticPages);
router.post("/", createStaticPage);

router.get("/structured/:pageType/preview", previewStructuredPage);
router.get("/structured/:pageType", getStructuredPage);
router.put("/structured/:pageType", updateStructuredPage);
router.get("/:id/preview", previewStaticPage);
router.patch("/:id/archive", archiveStaticPage);
router.get("/:id", getStaticPageById);
router.patch("/:id", updateStaticPage);
router.put("/:id", updateStaticPage);
router.delete("/:id", deleteStaticPage);

module.exports = router;
