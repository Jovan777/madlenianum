const express = require("express");

const {
  getNewsList,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  archiveNews,
  previewNews,
} = require("../controllers/news.controller");

const router = express.Router();

router.get("/", getNewsList);
router.post("/", createNews);

router.get("/:id/preview", previewNews);
router.patch("/:id/archive", archiveNews);
router.get("/:id", getNewsById);
router.patch("/:id", updateNews);
router.put("/:id", updateNews);
router.delete("/:id", deleteNews);

module.exports = router;
