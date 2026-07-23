require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const customerRoutes = require("./routes/customer.routes");
const mediaConfig = require("./config/media.config");

const connectDB = require("./config/db");

const adminRoutes = require("./routes/admin.routes");
const publicRoutes = require("./routes/public.routes");

const { notFound, errorHandler } = require("./middleware/error.middleware");
const { processExpiredOrders } = require("./services/orderLifecycle.service");
const SeatLock = require("./models/SeatLock");

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:4200",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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

app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/customer", customerRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const cleanupIntervalMs = Math.max(
      30000,
      Number(process.env.ORDER_EXPIRY_INTERVAL_MS || 60000)
    );
    const expiryTimer = setInterval(async () => {
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
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });
