require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const mediaConfig = require("./config/media.config");
const securityConfig = require("./config/security.config");

const connectDB = require("./config/db");

const adminRoutes = require("./routes/admin.routes");
const publicRoutes = require("./routes/public.routes");

const { notFound, errorHandler } = require("./middleware/error.middleware");
const { processExpiredOrders } = require("./services/orderLifecycle.service");
const SeatLock = require("./models/SeatLock");

const app = express();

const validateProductionConfiguration = () => {
  if (process.env.NODE_ENV !== "production") return;
  const secret = String(process.env.JWT_SECRET || "");
  if (secret.length < 32 || secret.includes("replace_with")) {
    throw new Error("JWT_SECRET must be a unique production secret with at least 32 characters.");
  }
  if (!process.env.CLIENT_URLS && !process.env.CLIENT_URL) {
    throw new Error("CLIENT_URLS or CLIENT_URL is required in production.");
  }
};

validateProductionConfiguration();

app.disable("x-powered-by");
app.set("trust proxy", securityConfig.trustProxy);

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || securityConfig.allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
        return callback(null, true);
      }
      const error = new Error("Origin is not allowed by CORS policy.");
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: securityConfig.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: securityConfig.urlEncodedBodyLimit }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(
  mediaConfig.publicBasePath,
  express.static(mediaConfig.uploadRoot)
);

app.get("/", (req, res) => {
  res.send("Madlenianum API is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    message: "Madlenianum backend is running",
  });
});

app.get("/api/ready", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    status: databaseReady ? "ready" : "not_ready",
    checks: { database: databaseReady ? "connected" : "disconnected" },
  });
});

app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let server;
let expiryTimer;
let shutdownStarted = false;

const shutdown = async (signal) => {
  if (shutdownStarted) return;
  shutdownStarted = true;
  console.log(`${signal} received. Shutting down gracefully.`);
  if (expiryTimer) clearInterval(expiryTimer);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mongoose.connection.readyState) await mongoose.disconnect();
};

connectDB()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const cleanupIntervalMs = Math.max(
      30000,
      Number(process.env.ORDER_EXPIRY_INTERVAL_MS || 60000)
    );
    expiryTimer = setInterval(async () => {
      try {
        const now = new Date();
        await SeatLock.updateMany(
          { status: "active", expiresAt: { $lte: now } },
          { $set: { status: "expired" } }
        );
        await processExpiredOrders();
      } catch (error) {
        console.error("Ticketing expiry cleanup failed:", error.message);
      }
    }, cleanupIntervalMs);
    expiryTimer.unref();
    server.on("close", () => clearInterval(expiryTimer));

    process.once("SIGTERM", () => {
      shutdown("SIGTERM").then(() => process.exit(0));
    });
    process.once("SIGINT", () => {
      shutdown("SIGINT").then(() => process.exit(0));
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });

module.exports = { app, shutdown };
