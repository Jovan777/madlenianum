const asyncHandler = require("../utils/asyncHandler");
const CostumeItem = require("../models/CostumeItem");
const PropScenographyItem = require("../models/PropScenographyItem");
const {
  applyAudit,
  applyPublishing,
  createHttpError,
  escapeRegex,
  paginationFrom,
  publicPublishedFilter,
  sendList,
} = require("../services/cms.service");
const { buildContentFilter } = require("../services/phase6aAdmin.service");
const {
  populateCostume,
  populatePropScenography,
} = require("../services/phase6aPopulate.service");
const {
  costumeDto,
  propScenographyDto,
} = require("../services/phase6aDto.service");

const sortFor = (value) => {
  const map = {
    title: "title",
    newest: "-createdAt",
    featured: "-isFeatured displayOrder title",
    display: "displayOrder title",
  };
  return map[value] || "displayOrder title";
};

const publicCostumeFilter = (query) => {
  const filter = publicPublishedFilter();
  if (query.gender) filter.gender = query.gender;
  if (query.epoch) filter.epoch = query.epoch;
  if (query.condition) filter.condition = query.condition;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === "true";
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$and = [{ $or: [{ title: search }, { shortDescription: search }, { description: search }, { inventoryNumber: search }] }];
  }
  return filter;
};

const publicPropFilter = (query) => {
  const filter = publicPublishedFilter();
  if (query.itemType) filter.itemType = query.itemType;
  if (query.category) filter.category = query.category;
  if (query.epochOrStyle) filter.epochOrStyle = query.epochOrStyle;
  if (query.condition) filter.condition = query.condition;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === "true";
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$and = [{ $or: [{ title: search }, { description: search }, { category: search }, { inventoryNumber: search }] }];
  }
  return filter;
};

const listPublicCostumes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query, { limit: 12 });
  const filter = publicCostumeFilter(req.query);
  const [items, total] = await Promise.all([
    populateCostume(CostumeItem.find(filter).sort(sortFor(req.query.sort)).skip(skip).limit(limit)),
    CostumeItem.countDocuments(filter),
  ]);
  sendList(res, { items: items.map((item) => costumeDto(item)), total, page, limit });
});

const getPublicCostume = asyncHandler(async (req, res) => {
  const item = await populateCostume(CostumeItem.findOne({ slug: req.params.slug, ...publicPublishedFilter() }));
  if (!item) throw createHttpError(404, "Kostim nije pronadjen.");
  res.json({ success: true, item: costumeDto(item) });
});

const listPublicPropsScenography = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query, { limit: 12 });
  const filter = publicPropFilter(req.query);
  const [items, total] = await Promise.all([
    populatePropScenography(PropScenographyItem.find(filter).sort(sortFor(req.query.sort)).skip(skip).limit(limit)),
    PropScenographyItem.countDocuments(filter),
  ]);
  sendList(res, { items: items.map((item) => propScenographyDto(item)), total, page, limit });
});

const getPublicPropScenography = asyncHandler(async (req, res) => {
  const item = await populatePropScenography(PropScenographyItem.findOne({ slug: req.params.slug, ...publicPublishedFilter() }));
  if (!item) throw createHttpError(404, "Rekvizit ili scenografija nije pronadjen.");
  res.json({ success: true, item: propScenographyDto(item) });
});

const createCrud = ({ Model, populate, dto, notFound, fields }) => {
  const list = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginationFrom(req.query);
    const filter = buildContentFilter(req.query, fields);
    const [items, total] = await Promise.all([
      populate(Model.find(filter).sort(sortFor(req.query.sort)).skip(skip).limit(limit)),
      Model.countDocuments(filter),
    ]);
    sendList(res, { items: items.map((item) => dto(item, { admin: true })), total, page, limit });
  });

  const get = asyncHandler(async (req, res) => {
    const item = await populate(Model.findById(req.params.id));
    if (!item) throw createHttpError(404, notFound);
    res.json({ success: true, item: dto(item, { admin: true }) });
  });

  const preview = asyncHandler(async (req, res) => {
    const item = await populate(Model.findById(req.params.id));
    if (!item) throw createHttpError(404, notFound);
    res.json({ success: true, preview: true, robots: "noindex,nofollow", item: dto(item, { admin: false }) });
  });

  const create = asyncHandler(async (req, res) => {
    const item = new Model(req.body);
    applyAudit(item, req.admin, { isNew: true });
    applyPublishing(item);
    await item.save();
    const populated = await populate(Model.findById(item._id));
    res.status(201).json({ success: true, item: dto(populated, { admin: true }) });
  });

  const update = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw createHttpError(404, notFound);
    const previousStatus = item.status;
    Object.assign(item, req.body);
    applyAudit(item, req.admin);
    applyPublishing(item, previousStatus);
    await item.save();
    const populated = await populate(Model.findById(item._id));
    res.json({ success: true, item: dto(populated, { admin: true }) });
  });

  const publish = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw createHttpError(404, notFound);
    item.status = "published";
    applyAudit(item, req.admin);
    applyPublishing(item, "draft");
    await item.save();
    const populated = await populate(Model.findById(item._id));
    res.json({ success: true, message: "Sadrzaj je objavljen.", item: dto(populated, { admin: true }) });
  });

  const archive = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw createHttpError(404, notFound);
    item.status = "archived";
    applyAudit(item, req.admin);
    await item.save();
    const populated = await populate(Model.findById(item._id));
    res.json({ success: true, message: "Sadrzaj je arhiviran.", item: dto(populated, { admin: true }) });
  });

  const remove = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw createHttpError(404, notFound);
    await item.deleteOne();
    res.json({ success: true, message: "Sadrzaj je obrisan." });
  });

  return { archive, create, get, list, preview, publish, remove, update };
};

const costumeCrud = createCrud({
  Model: CostumeItem,
  populate: populateCostume,
  dto: costumeDto,
  notFound: "Kostim nije pronadjen.",
  fields: ["gender", "epoch", "condition"],
});

const propCrud = createCrud({
  Model: PropScenographyItem,
  populate: populatePropScenography,
  dto: propScenographyDto,
  notFound: "Rekvizit ili scenografija nije pronadjen.",
  fields: ["itemType", "category", "epochOrStyle", "condition"],
});

module.exports = {
  archiveCostume: costumeCrud.archive,
  archivePropScenography: propCrud.archive,
  createCostume: costumeCrud.create,
  createPropScenography: propCrud.create,
  deleteCostume: costumeCrud.remove,
  deletePropScenography: propCrud.remove,
  getCostumeById: costumeCrud.get,
  getPropScenographyById: propCrud.get,
  getPublicCostume,
  getPublicPropScenography,
  listCostumes: costumeCrud.list,
  listPropScenography: propCrud.list,
  listPublicCostumes,
  listPublicPropsScenography,
  previewCostume: costumeCrud.preview,
  previewPropScenography: propCrud.preview,
  publishCostume: costumeCrud.publish,
  publishPropScenography: propCrud.publish,
  updateCostume: costumeCrud.update,
  updatePropScenography: propCrud.update,
};
