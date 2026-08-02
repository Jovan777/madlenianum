const express = require("express");
const { publicLocale } = require("../services/locale.service");

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
const {
  publicLookupLimiter,
  publicMutationLimiter,
  seatLockLimiter,
} = require("../middleware/securityLimits.middleware");

router.use(publicLocale);

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
router.post("/rental-inquiries", publicMutationLimiter, createRentalInquiry);
router.post("/event-planning-inquiries", publicMutationLimiter, createEventPlanningInquiry);

router.get("/events/:eventId/seats", getEventSeats);
router.post("/events/:eventId/seats/lock", seatLockLimiter, lockSeats);
router.post("/events/:eventId/seats/release", seatLockLimiter, releaseSeats);
router.get("/events/:eventId/seats/locks/current", restoreSeatLocks);

router.post("/orders", publicMutationLimiter, createOrder);
router.post("/orders/lookup", publicLookupLimiter, lookupPublicOrder);
router.get("/orders/:identifier", getPublicOrder);

router.post("/newsletter/subscribe", publicMutationLimiter, subscribeNewsletter);
router.post("/contact", publicMutationLimiter, sendContactMessage);

module.exports = router;
