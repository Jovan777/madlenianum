const asyncHandler = require("../utils/asyncHandler");
const Media = require("../models/Media");
const mediaStorage = require("../services/localMediaStorage.service");
const { findMediaUsage } = require("../services/mediaUsage.service");
const { withMergedTranslations } = require("../services/localizedContent.service");

const getFileType = (mimeType) => (mimeType.startsWith("image/") ? "image" : "document");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const buildMediaPayload = (file, body, adminId) => {
  const storagePath = mediaStorage.getStoragePath(file.path);
  const altText = body.altText ?? body.alt ?? "";

  return {
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    storagePath,
    url: mediaStorage.getPublicUrl(storagePath),
    fileType: getFileType(file.mimetype),
    title: body.title || "",
    alt: altText,
    caption: body.caption ?? body.description ?? "",
    credit: body.credit || "",
    createdBy: adminId,
  };
};

const createUploadedMedia = async (files, body, adminId) => {
  try {
    const payloads = files.map((file) => buildMediaPayload(file, body, adminId));
    return await Media.insertMany(payloads);
  } catch (error) {
    await Promise.allSettled(
      files.map((file) => mediaStorage.deleteAbsoluteManagedFile(file.path))
    );
    throw error;
  }
};

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file was uploaded.");
  }

  const [media] = await createUploadedMedia([req.file], req.body, req.admin?._id);

  res.status(201).json({
    success: true,
    item: media,
  });
});

const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.files) || req.files.length === 0) {
    res.status(400);
    throw new Error("No files were uploaded.");
  }

  const items = await createUploadedMedia(req.files, req.body, req.admin?._id);

  res.status(201).json({
    success: true,
    count: items.length,
    items,
  });
});

const listMedia = asyncHandler(async (req, res) => {
  const page = positiveInteger(req.query.page, 1);
  const limit = Math.min(positiveInteger(req.query.limit, 24), 100);
  const skip = (page - 1) * limit;
  const filter = {};

  const fileType = req.query.fileType || req.query.type || req.query.mimeGroup;

  if (fileType && fileType !== "all") {
    if (!["image", "document", "video", "other"].includes(fileType)) {
      res.status(400);
      throw new Error("Invalid media type filter.");
    }

    filter.fileType = fileType;
  }

  const search = String(req.query.q || req.query.search || "").trim().slice(0, 100);

  if (search) {
    const expression = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { title: expression },
      { filename: expression },
      { originalName: expression },
    ];
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name: { title: 1, originalName: 1 },
  };
  const sort = sortOptions[req.query.sort] || sortOptions.newest;

  const [total, items] = await Promise.all([
    Media.countDocuments(filter),
    Media.find(filter)
      .populate("createdBy", "username email")
      .sort(sort)
      .skip(skip)
      .limit(limit),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));

  res.json({
    success: true,
    page,
    limit,
    total,
    totalPages: pages,
    pagination: { page, limit, total, pages },
    items,
  });
});

const getMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id).populate("createdBy", "username email");

  if (!media) {
    res.status(404);
    throw new Error("Media item was not found.");
  }

  res.json({ success: true, item: media });
});

const updateMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);

  if (!media) {
    res.status(404);
    throw new Error("Media item was not found.");
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
    media.title = String(req.body.title || "").trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "altText") ||
    Object.prototype.hasOwnProperty.call(req.body, "alt")
  ) {
    media.alt = String(req.body.altText ?? req.body.alt ?? "").trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "caption") ||
    Object.prototype.hasOwnProperty.call(req.body, "description")
  ) {
    media.caption = String(req.body.caption ?? req.body.description ?? "").trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "credit")) {
    media.credit = String(req.body.credit || "").trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "translations")) {
    const merged = withMergedTranslations(media, {
      translations: {
        en: {
          title: String(req.body.translations?.en?.title || "").trim(),
          alt: String(req.body.translations?.en?.alt || "").trim(),
          caption: String(req.body.translations?.en?.caption || "").trim(),
          credit: String(req.body.translations?.en?.credit || "").trim(),
        },
      },
    });
    media.translations = merged.translations;
  }

  await media.save();

  res.json({ success: true, item: media });
});

const getMediaUsage = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id).select("_id");

  if (!media) {
    res.status(404);
    throw new Error("Media item was not found.");
  }

  const usage = await findMediaUsage(media._id);

  res.json({
    success: true,
    inUse: usage.length > 0,
    usage,
  });
});

const deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);

  if (!media) {
    res.status(404);
    throw new Error("Media item was not found.");
  }

  const usage = await findMediaUsage(media._id);

  if (usage.length > 0) {
    return res.status(409).json({
      success: false,
      message: "Media is currently in use.",
      usage,
    });
  }

  const fileResult = await mediaStorage.deleteManagedFile(media);
  await media.deleteOne();

  res.json({
    success: true,
    message: fileResult.reason === "missing"
      ? "Media record was deleted; the physical file was already missing."
      : "Media item was deleted.",
    fileDeleted: fileResult.deleted,
  });
});

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  listMedia,
  getMedia,
  updateMedia,
  getMediaUsage,
  deleteMedia,
};
