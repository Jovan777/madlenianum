const slugify = require("../utils/slugify");

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSlug = (value, fallback) => slugify(value || fallback);

const applyAudit = (document, admin, { isNew = false } = {}) => {
  if (!admin?._id) return;

  if (isNew && !document.createdBy) {
    document.createdBy = admin._id;
  }

  document.updatedBy = admin._id;
};

const applyPublishing = (document, previousStatus) => {
  if (document.status === "published" && previousStatus !== "published" && !document.publishedAt) {
    document.publishedAt = new Date();
  }
};

const paginationFrom = (query, defaults = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || defaults.limit || 20, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const sendList = (res, { items, total, page, limit }) => {
  const totalPages = Math.max(Math.ceil(total / limit), total ? 1 : 0);

  res.json({
    success: true,
    items,
    page,
    limit,
    total,
    totalPages,
    pagination: { page, limit, total, totalPages },
  });
};

const createHttpError = (statusCode, message, details) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
};

const publicPublishedFilter = (now = new Date()) => ({
  status: "published",
  $or: [
    { publishedAt: { $exists: false } },
    { publishedAt: null },
    { publishedAt: { $lte: now } },
  ],
});

// Mongo filters such as localized slug and publication state can both contain
// top-level operators (most notably $or). Object-spreading those filters loses
// one of the operators, so compose independent constraints explicitly.
const combineFilters = (...filters) => {
  const constraints = filters.filter((filter) => filter && Object.keys(filter).length);
  if (!constraints.length) return {};
  if (constraints.length === 1) return constraints[0];
  return { $and: constraints };
};

module.exports = {
  applyAudit,
  applyPublishing,
  combineFilters,
  createHttpError,
  escapeRegex,
  normalizeSlug,
  paginationFrom,
  publicPublishedFilter,
  sendList,
};
