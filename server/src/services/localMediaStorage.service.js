const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const mediaConfig = require("../config/media.config");

const normalizeRelativePath = (value) => {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
};

const isPathInside = (candidatePath, rootPath) => {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const safeDecodePath = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
};

const encodePublicPath = (relativePath) => {
  return normalizeRelativePath(relativePath)
    .split("/")
    .map((part) => encodeURIComponent(safeDecodePath(part)))
    .join("/");
};

const ensureUploadDirectory = (mediaType) => {
  const typeDirectory = mediaType === "image" ? "images" : "documents";
  const destination = path.resolve(
    mediaConfig.uploadRoot,
    mediaConfig.uploadSubdirectory,
    typeDirectory
  );

  if (!isPathInside(destination, mediaConfig.uploadRoot)) {
    throw new Error("Invalid media upload destination.");
  }

  fs.mkdirSync(destination, { recursive: true });
  return destination;
};

const sanitizeFilenameBase = (filename) => {
  const base = path.basename(filename, path.extname(filename));
  const normalized = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return normalized || "media";
};

const generateStoredFilename = (originalName) => {
  const extension = path.extname(originalName).toLowerCase();
  const uniquePart = crypto.randomUUID();
  return `${Date.now()}-${uniquePart}-${sanitizeFilenameBase(originalName)}${extension}`;
};

const getStoragePath = (absolutePath) => {
  const resolvedPath = path.resolve(absolutePath);

  if (!isPathInside(resolvedPath, mediaConfig.uploadRoot)) {
    throw new Error("Media file is outside the configured upload directory.");
  }

  return normalizeRelativePath(path.relative(mediaConfig.uploadRoot, resolvedPath));
};

const getPublicUrl = (storagePath) => {
  return `${mediaConfig.publicBasePath}/${encodePublicPath(storagePath)}`;
};

const storagePathFromMedia = (media) => {
  const explicitPath = media?.storagePath || media?.relativePath || media?.path;

  if (explicitPath) {
    const normalized = normalizeRelativePath(explicitPath);
    const uploadDirectoryName = normalizeRelativePath(
      path.relative(mediaConfig.serverRoot, mediaConfig.uploadRoot)
    );

    if (uploadDirectoryName && normalized.startsWith(`${uploadDirectoryName}/`)) {
      return normalized.slice(uploadDirectoryName.length + 1);
    }

    return normalized;
  }

  const rawUrl = String(media?.url || "");
  const prefix = `${mediaConfig.publicBasePath}/`;

  if (!rawUrl.startsWith(prefix)) {
    return "";
  }

  return normalizeRelativePath(safeDecodePath(rawUrl.slice(prefix.length)));
};

const resolveManagedFile = (media) => {
  const storagePath = storagePathFromMedia(media);

  if (!storagePath) {
    return null;
  }

  const absolutePath = path.resolve(mediaConfig.uploadRoot, storagePath);

  if (!isPathInside(absolutePath, mediaConfig.uploadRoot)) {
    return null;
  }

  return {
    absolutePath,
    storagePath,
  };
};

const deleteManagedFile = async (media) => {
  const resolved = resolveManagedFile(media);

  if (!resolved) {
    return { deleted: false, reason: "external_or_unmanaged" };
  }

  try {
    await fs.promises.unlink(resolved.absolutePath);
    return { deleted: true, storagePath: resolved.storagePath };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { deleted: false, reason: "missing", storagePath: resolved.storagePath };
    }

    throw error;
  }
};

const deleteAbsoluteManagedFile = async (absolutePath) => {
  const resolvedPath = path.resolve(absolutePath);

  if (!isPathInside(resolvedPath, mediaConfig.uploadRoot)) {
    return false;
  }

  try {
    await fs.promises.unlink(resolvedPath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

module.exports = {
  ensureUploadDirectory,
  generateStoredFilename,
  getStoragePath,
  getPublicUrl,
  resolveManagedFile,
  deleteManagedFile,
  deleteAbsoluteManagedFile,
};
