const express = require("express");

const {
  register,
  login,
  me,
  updateProfile,
  getMyOrders,
  getMyOrderById,
} = require("../controllers/customer.controller");

const { createOrder } = require("../controllers/ticketingPublic.controller");
const { protectCustomer } = require("../middleware/customerAuth.middleware");

const router = express.Router();

router.post("/auth/register", register);
router.post("/auth/login", login);

router.use(protectCustomer);

router.get("/auth/me", me);
router.patch("/profile", updateProfile);
router.put("/profile", updateProfile);

router.post("/orders", createOrder);
router.get("/orders", getMyOrders);
router.get("/orders/:id", getMyOrderById);

module.exports = router;