const path = require("path");

const serverRoot = path.resolve(__dirname, "../..");
const configuredUploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadRoot = path.isAbsolute(configuredUploadDir)
  ? path.resolve(configuredUploadDir)
  : path.resolve(serverRoot, configuredUploadDir);

const configuredSubdirectory = process.env.MEDIA_UPLOAD_SUBDIR || "madlenianum/media";
const normalizedSubdirectory = configuredSubdirectory
  .replace(/\\/g, "/")
  .replace(/^\/+|\/+$/g, "");

if (
  !normalizedSubdirectory ||
  normalizedSubdirectory.split("/").some((part) => part === "." || part === "..")
) {
  throw new Error("MEDIA_UPLOAD_SUBDIR must be a safe relative path.");
}

const parsedMaximumSize = Number(process.env.MEDIA_MAX_FILE_SIZE_MB || 10);
const maximumFileSizeMb = Number.isFinite(parsedMaximumSize) && parsedMaximumSize > 0
  ? parsedMaximumSize
  : 10;

const allowedMimeExtensions = Object.freeze({
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
});

module.exports = Object.freeze({
  serverRoot,
  uploadRoot,
  uploadSubdirectory: normalizedSubdirectory,
  publicBasePath: "/uploads",
  maximumFileSizeMb,
  maximumFileSizeBytes: Math.round(maximumFileSizeMb * 1024 * 1024),
  maximumFilesPerUpload: 20,
  allowedMimeExtensions,
});
