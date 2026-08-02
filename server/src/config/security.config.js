const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const splitOrigins = (value) => String(value || "")
  .split(",")
  .map((item) => item.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = splitOrigins(
  process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:4200"
);

module.exports = Object.freeze({
  allowedOrigins,
  trustProxy: parsePositiveInteger(process.env.TRUST_PROXY_HOPS, 1),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "2mb",
  urlEncodedBodyLimit: process.env.URLENCODED_BODY_LIMIT || "2mb",
  rateLimits: Object.freeze({
    adminLogin: {
      windowMs: parsePositiveInteger(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * 60 * 1000),
      max: parsePositiveInteger(process.env.RATE_LIMIT_LOGIN_MAX, 10),
    },
    publicLookup: {
      windowMs: parsePositiveInteger(process.env.RATE_LIMIT_LOOKUP_WINDOW_MS, 15 * 60 * 1000),
      max: parsePositiveInteger(process.env.RATE_LIMIT_LOOKUP_MAX, 30),
    },
    publicMutation: {
      windowMs: parsePositiveInteger(process.env.RATE_LIMIT_PUBLIC_MUTATION_WINDOW_MS, 60 * 1000),
      max: parsePositiveInteger(process.env.RATE_LIMIT_PUBLIC_MUTATION_MAX, 30),
    },
    seatLock: {
      windowMs: parsePositiveInteger(process.env.RATE_LIMIT_SEAT_LOCK_WINDOW_MS, 60 * 1000),
      max: parsePositiveInteger(process.env.RATE_LIMIT_SEAT_LOCK_MAX, 60),
    },
    resend: {
      windowMs: parsePositiveInteger(process.env.RATE_LIMIT_RESEND_WINDOW_MS, 15 * 60 * 1000),
      max: parsePositiveInteger(process.env.RATE_LIMIT_RESEND_MAX, 10),
    },
    upload: {
      windowMs: parsePositiveInteger(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS, 15 * 60 * 1000),
      max: parsePositiveInteger(process.env.RATE_LIMIT_UPLOAD_MAX, 60),
    },
  }),
});
