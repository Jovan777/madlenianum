const express = require("express");

const {
  getNewsList,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
} = require("../controllers/news.controller");

const router = express.Router();

router.get("/", getNewsList);
router.post("/", createNews);

router.get("/:id", getNewsById);
router.patch("/:id", updateNews);
router.put("/:id", updateNews);
router.delete("/:id", deleteNews);

module.exports = router;