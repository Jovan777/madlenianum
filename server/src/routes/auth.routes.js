const express = require("express");
const { login } = require("../controllers/auth.controller");
const { adminLoginLimiter } = require("../middleware/securityLimits.middleware");

const router = express.Router();

router.post("/login", adminLoginLimiter, login);

module.exports = router;
