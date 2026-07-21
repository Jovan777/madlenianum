const path = require("path");
const multer = require("multer");

const mediaConfig = require("../config/media.config");
const mediaStorage = require("../services/localMediaStorage.service");

const getMediaType = (mimeType) => (mimeType.startsWith("image/") ? "image" : "document");

const storage = multer.diskStorage({
  destination: (_req, file, callback) => {
    try {
      callback(null, mediaStorage.ensureUploadDirectory(getMediaType(file.mimetype)));
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    callback(null, mediaStorage.generateStoredFilename(file.originalname));
  },
});

const fileFilter = (_req, file, callback) => {
  const allowedExtensions = mediaConfig.allowedMimeExtensions[file.mimetype];
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions) {
    const error = new Error("Unsupported file type. Allowed types are JPG, PNG, WEBP, GIF and PDF.");
    error.statusCode = 400;
    return callback(error, false);
  }

  if (!allowedExtensions.includes(extension)) {
    const error = new Error("The file extension does not match the uploaded MIME type.");
    error.statusCode = 400;
    return callback(error, false);
  }

  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: mediaConfig.maximumFileSizeBytes,
    files: mediaConfig.maximumFilesPerUpload,
  },
});

module.exports = upload;
