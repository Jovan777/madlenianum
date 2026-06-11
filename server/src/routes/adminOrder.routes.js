const express = require("express");

const {
  getOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/adminOrder.controller");

const router = express.Router();

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.patch("/:id/status", updateOrderStatus);
router.put("/:id/status", updateOrderStatus);

module.exports = router;