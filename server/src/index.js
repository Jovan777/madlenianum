require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const customerRoutes = require("./routes/customer.routes");

const connectDB = require("./config/db");

const adminRoutes = require("./routes/admin.routes");
const publicRoutes = require("./routes/public.routes");

const { notFound, errorHandler } = require("./middleware/error.middleware");

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
  "/uploads",
  express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads"))
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
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });