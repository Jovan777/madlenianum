const express = require("express");

const {
  getStaticPages,
  getStaticPageById,
  createStaticPage,
  updateStaticPage,
  deleteStaticPage,
} = require("../controllers/staticPage.controller");

const router = express.Router();

router.get("/", getStaticPages);
router.post("/", createStaticPage);

router.get("/:id", getStaticPageById);
router.patch("/:id", updateStaticPage);
router.put("/:id", updateStaticPage);
router.delete("/:id", deleteStaticPage);

module.exports = router;