const mongoose = require("mongoose");
const { INQUIRY_STATUSES } = require("../constants/phase6a.constants");
const { createHttpError, escapeRegex, paginationFrom } = require("./cms.service");

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const buildContentFilter = (query, fields = []) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === "true";
  for (const field of fields) {
    if (query[field] !== undefined && query[field] !== "") filter[field] = query[field];
  }
  if (query.relatedProduction) {
    if (!isObjectId(query.relatedProduction)) return { _id: null };
    filter.relatedProduction = query.relatedProduction;
  }
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [
      { title: search },
      { slug: search },
      { inventoryNumber: search },
      { shortDescription: search },
      { description: search },
    ];
  }
  return filter;
};

const buildInquiryFilter = async (query, { spaceField } = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.emailStatus) filter["emailDelivery.status"] = query.emailStatus;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }
  if (query.desiredFrom || query.desiredTo) {
    filter.desiredDate = {};
    if (query.desiredFrom) filter.desiredDate.$gte = new Date(query.desiredFrom);
    if (query.desiredTo) {
      const to = new Date(query.desiredTo);
      to.setHours(23, 59, 59, 999);
      filter.desiredDate.$lte = to;
    }
  }
  if (query.space && spaceField) {
    if (!isObjectId(query.space)) return { _id: null };
    filter[spaceField] = query.space;
  }
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [
      { referenceNumber: search },
      { firstName: search },
      { lastName: search },
      { companyName: search },
      { email: search },
      { phone: search },
      { note: search },
      { internalNotes: search },
    ];
  }
  return filter;
};

const validateInquiryTransition = (fromStatus, toStatus) => {
  if (!INQUIRY_STATUSES.includes(toStatus)) {
    throw createHttpError(400, "Status upita nije podrzan.", {
      field: "status",
      allowed: INQUIRY_STATUSES,
    });
  }
  if (fromStatus === toStatus) return;
  if (["closed", "rejected"].includes(fromStatus) && !["in_review", "contacted"].includes(toStatus)) {
    throw createHttpError(409, "Zatvoren ili odbijen upit moze se vratiti samo u obradu ili kontaktirano stanje.", {
      fromStatus,
      toStatus,
    });
  }
};

const pagedQuery = async ({ Model, filter, query, populate, sort = "-createdAt" }) => {
  const { page, limit, skip } = paginationFrom(query, { limit: 20 });
  const dbQuery = Model.find(filter).sort(sort).skip(skip).limit(limit);
  const [items, total] = await Promise.all([
    populate ? populate(dbQuery) : dbQuery,
    Model.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};

module.exports = {
  buildContentFilter,
  buildInquiryFilter,
  isObjectId,
  pagedQuery,
  validateInquiryTransition,
};
