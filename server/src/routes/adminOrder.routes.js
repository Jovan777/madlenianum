const express = require("express");

const {
  getOrders,
  getOrderById,
  getOrderOverview,
  cancelOrder,
  createSecurePublicLink,
  markOrderPaid,
  resendOrderConfirmation,
  updateOrderStatus,
} = require("../controllers/adminOrder.controller");

const router = express.Router();
const { resendLimiter } = require("../middleware/securityLimits.middleware");

router.get("/overview", getOrderOverview);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/:id/cancel", cancelOrder);
router.post("/:id/mark-paid", markOrderPaid);
router.post("/:id/resend-confirmation", resendLimiter, resendOrderConfirmation);
router.post("/:id/public-link", createSecurePublicLink);
router.patch("/:id/status", updateOrderStatus);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
