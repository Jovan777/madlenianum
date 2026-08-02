const notFound = (req, res, next) => {
  const error = new Error(`Ruta nije pronađena: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || "Server error";

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Neispravan ID format.";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(" ");
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Vrednost za polje "${field}" već postoji.`;
  }

  if (err.name === "MulterError") {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = err.code === "LIMIT_FILE_SIZE"
      ? "The uploaded file exceeds the configured size limit."
      : `Upload failed: ${err.message}`;
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && statusCode >= 500) {
    message = "Došlo je do interne greške. Pokušajte ponovo kasnije.";
  }

  const safeDetails = statusCode < 500 ? err.details : undefined;

  res.status(statusCode).json({
    success: false,
    message,
    code: err.code && statusCode < 500 ? err.code : undefined,
    details: safeDetails,
    stack: isProduction ? undefined : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
