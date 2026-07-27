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
  getPublicSiteSettings,
} = require("../controllers/public.controller");
const {
  getPublicCostume,
  getPublicPropScenography,
  listPublicCostumes,
  listPublicPropsScenography,
} = require("../controllers/fundus.controller");
const {
  createEventPlanningInquiry,
  createRentalInquiry,
  getPublicRentalSpace,
  listPublicRentalSpaces,
} = require("../controllers/rental.controller");

const {
  getEventSeats,
  lockSeats,
  releaseSeats,
  createOrder,
  getPublicOrder,
  lookupPublicOrder,
  restoreSeatLocks,
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
router.get("/site-settings", getPublicSiteSettings);

router.get("/fundus/costumes", listPublicCostumes);
router.get("/fundus/costumes/:slug", getPublicCostume);
router.get("/fundus/props-scenography", listPublicPropsScenography);
router.get("/fundus/props-scenography/:slug", getPublicPropScenography);

router.get("/rental-spaces", listPublicRentalSpaces);
router.get("/rental-spaces/:slug", getPublicRentalSpace);
router.post("/rental-inquiries", createRentalInquiry);
router.post("/event-planning-inquiries", createEventPlanningInquiry);

router.get("/events/:eventId/seats", getEventSeats);
router.post("/events/:eventId/seats/lock", lockSeats);
router.post("/events/:eventId/seats/release", releaseSeats);
router.get("/events/:eventId/seats/locks/current", restoreSeatLocks);

router.post("/orders", createOrder);
router.post("/orders/lookup", lookupPublicOrder);
router.get("/orders/:identifier", getPublicOrder);

router.post("/newsletter/subscribe", subscribeNewsletter);
router.post("/contact", sendContactMessage);

module.exports = router;
