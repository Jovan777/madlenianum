const fs = require("fs");
const path = require("path");
const asyncHandler = require("../utils/asyncHandler");
const Media = require("../models/Media");

const getFileType = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("text")
  ) {
    return "document";
  }

  return "other";
};

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Fajl nije poslat.");
  }

  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  const normalizedPath = req.file.path.replace(/\\/g, "/");
  const publicIndex = normalizedPath.lastIndexOf(uploadDir);
  const publicPath = normalizedPath.substring(publicIndex);

  const media = await Media.create({
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `/${publicPath}`,
    fileType: getFileType(req.file.mimetype),
    alt: req.body.alt || "",
    caption: req.body.caption || "",
    createdBy: req.admin?._id,
  });

  res.status(201).json({
    success: true,
    item: media,
  });
});

const listMedia = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.fileType) {
    filter.fileType = req.query.fileType;
  }

  const total = await Media.countDocuments(filter);

  const items = await Media.find(filter)
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items,
  });
});

const deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);

  if (!media) {
    res.status(404);
    throw new Error("Fajl nije pronađen.");
  }

  const filePath = path.join(process.cwd(), media.url);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await media.deleteOne();

  res.json({
    success: true,
    message: "Fajl je obrisan.",
  });
});

module.exports = {
  uploadFile,
  listMedia,
  deleteMedia,
};