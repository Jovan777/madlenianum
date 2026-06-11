const express = require("express");

const {
  getCustomers,
  getCustomerById,
  updateCustomer,
} = require("../controllers/adminCustomer.controller");

const router = express.Router();

router.get("/", getCustomers);
router.get("/:id", getCustomerById);
router.patch("/:id", updateCustomer);
router.put("/:id", updateCustomer);

module.exports = router;