const express = require("express");

const {
  getHome,
  getRepertoire,
  listProductions,
  getProductionBySlug,
  listArtists,
  getArtistBySlug,
  listNews,
  getNewsBySlug,
  getPageBySlug,
  subscribeNewsletter,
  sendContactMessage,
} = require("../controllers/public.controller");

const {
  getEventSeats,
  lockSeats,
  releaseSeats,
  createOrder,
  getPublicOrder,
} = require("../controllers/ticketingPublic.controller");

const router = express.Router();

router.get("/home", getHome);

router.get("/repertoire", getRepertoire);

router.get("/productions", listProductions);
router.get("/productions/:slug", getProductionBySlug);

router.get("/artists", listArtists);
router.get("/artists/:slug", getArtistBySlug);

router.get("/news", listNews);
router.get("/news/:slug", getNewsBySlug);

router.get("/pages/:slug", getPageBySlug);

router.get("/events/:eventId/seats", getEventSeats);
router.post("/events/:eventId/seats/lock", lockSeats);
router.post("/events/:eventId/seats/release", releaseSeats);

router.post("/orders", createOrder);
router.get("/orders/:identifier", getPublicOrder);

router.post("/newsletter/subscribe", subscribeNewsletter);
router.post("/contact", sendContactMessage);

module.exports = router;