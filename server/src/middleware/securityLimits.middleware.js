const securityConfig = require("../config/security.config");
const { createRateLimiter } = require("./rateLimit.middleware");

const make = (key) => createRateLimiter({
  ...securityConfig.rateLimits[key],
  name: key,
});

module.exports = {
  adminLoginLimiter: make("adminLogin"),
  publicLookupLimiter: make("publicLookup"),
  publicMutationLimiter: make("publicMutation"),
  seatLockLimiter: make("seatLock"),
  resendLimiter: make("resend"),
  uploadLimiter: make("upload"),
};
