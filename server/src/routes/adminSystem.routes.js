const express = require("express");

const {
  getAdminSystemStatus,
} = require("../controllers/adminSystem.controller");

const router = express.Router();

router.get("/status", getAdminSystemStatus);

module.exports = router;