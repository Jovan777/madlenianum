const express = require("express");

const authRoutes = require("./auth.routes");
const { me } = require("../controllers/auth.controller");

const mediaRoutes = require("./media.routes");
const artistRoutes = require("./artist.routes");
const venueRoutes = require("./venue.routes");
const productionRoutes = require("./production.routes");
const eventRoutes = require("./event.routes");
const newsRoutes = require("./news.routes");
const promoSlideRoutes = require("./promoSlide.routes");
const staticPageRoutes = require("./staticPage.routes");
const newsletterRoutes = require("./newsletter.routes");
const contactMessageRoutes = require("./contactMessage.routes");
const adminSystemRoutes = require("./adminSystem.routes");
const priceCategoryRoutes = require("./priceCategory.routes");
const pricePlanRoutes = require("./pricePlan.routes");
const seatMapRoutes = require("./seatMap.routes");
const seatRoutes = require("./seat.routes");
const adminCustomerRoutes = require("./adminCustomer.routes");
const adminOrderRoutes = require("./adminOrder.routes");
const adminFormOptionsRoutes = require("./adminFormOptions.routes");
const homepageConfigRoutes = require("./homepageConfig.routes");
const siteSettingsRoutes = require("./siteSettings.routes");
const costumeRoutes = require("./costume.routes");
const propScenographyRoutes = require("./propScenography.routes");
const rentalSpaceRoutes = require("./rentalSpace.routes");
const rentalInquiryRoutes = require("./rentalInquiry.routes");
const eventPlanningInquiryRoutes = require("./eventPlanningInquiry.routes");
const adminAuditRoutes = require("./adminAudit.routes");
const { protectAdmin } = require("../middleware/auth.middleware");
const { adminAuditTrail } = require("../middleware/adminAudit.middleware");

const router = express.Router();

router.use("/auth", authRoutes);

router.use(protectAdmin);
router.use(adminAuditTrail);
router.use("/audit-logs", adminAuditRoutes);
router.use("/customers", adminCustomerRoutes);
router.use("/orders", adminOrderRoutes);
router.get("/auth/me", me);

router.use("/media", mediaRoutes);
router.use("/artists", artistRoutes);
router.use("/venues", venueRoutes);
router.use("/productions", productionRoutes);
router.use("/events", eventRoutes);
router.use("/news", newsRoutes);
router.use("/promo-slides", promoSlideRoutes);
router.use("/pages", staticPageRoutes);
router.use("/newsletter-subscribers", newsletterRoutes);
router.use("/contact-messages", contactMessageRoutes);
router.use("/system", adminSystemRoutes);
router.use("/price-categories", priceCategoryRoutes);
router.use("/price-plans", pricePlanRoutes);
router.use("/seat-maps", seatMapRoutes);
router.use("/seats", seatRoutes);
router.use("/form-options", adminFormOptionsRoutes);
router.use("/homepage-config", homepageConfigRoutes);
router.use("/site-settings", siteSettingsRoutes);
router.use("/fundus/costumes", costumeRoutes);
router.use("/fundus/props-scenography", propScenographyRoutes);
router.use("/rental-spaces", rentalSpaceRoutes);
router.use("/rental-inquiries", rentalInquiryRoutes);
router.use("/event-planning-inquiries", eventPlanningInquiryRoutes);

module.exports = router;
