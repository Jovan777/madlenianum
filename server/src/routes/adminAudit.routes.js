const express = require("express");
const { listAdminAuditLogs } = require("../controllers/adminAudit.controller");

const router = express.Router();
router.get("/", listAdminAuditLogs);
module.exports = router;
