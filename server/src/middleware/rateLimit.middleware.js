const stores = new Map();

const cleanupStore = (store, now) => {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
};

const createRateLimiter = ({ windowMs, max, name }) => {
  const store = new Map();
  stores.set(name, store);

  return (req, res, next) => {
    const now = Date.now();
    cleanupStore(store, now);
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const current = store.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    entry.count += 1;
    store.set(key, entry);

    const remaining = Math.max(0, max - entry.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        message: "Previše zahteva. Pokušajte ponovo kasnije.",
        code: "rate_limit_exceeded",
      });
    }

    return next();
  };
};

const resetRateLimitStores = () => {
  for (const store of stores.values()) store.clear();
};

module.exports = { createRateLimiter, resetRateLimitStores };
