const express = require("express");

const {
  getNewsletterSubscribers,
  getNewsletterSubscriberById,
  createNewsletterSubscriber,
  updateNewsletterSubscriber,
  deleteNewsletterSubscriber,
} = require("../controllers/newsletter.controller");

const router = express.Router();

router.get("/", getNewsletterSubscribers);
router.post("/", createNewsletterSubscriber);

router.get("/:id", getNewsletterSubscriberById);
router.patch("/:id", updateNewsletterSubscriber);
router.put("/:id", updateNewsletterSubscriber);
router.delete("/:id", deleteNewsletterSubscriber);

module.exports = router;