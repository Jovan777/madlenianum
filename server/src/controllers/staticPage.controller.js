const asyncHandler = require("../utils/asyncHandler");
const StaticPage = require("../models/StaticPage");
const { pageDto } = require("../services/cmsDto.service");
const { populatePage } = require("../services/cmsPopulate.service");
const { assignLocalizedPayload } = require("../services/localizedContent.service");
const {
  applyAudit,
  applyPublishing,
  createHttpError,
  escapeRegex,
  paginationFrom,
  sendList,
} = require("../services/cms.service");

const STRUCTURED_TYPES = ["about", "contact"];

const getStaticPages = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.pageType) filter.pageType = req.query.pageType;
  if (req.query.q) {
    const search = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ title: search }, { slug: search }];
  }
  const [total, pages] = await Promise.all([
    StaticPage.countDocuments(filter),
    populatePage(StaticPage.find(filter).sort("title").skip(skip).limit(limit)),
  ]);
  sendList(res, { items: pages, total, page, limit });
});

const getStaticPageById = asyncHandler(async (req, res) => {
  const page = await populatePage(StaticPage.findById(req.params.id));
  if (!page) throw createHttpError(404, "Strana nije pronadjena.");
  res.json({ success: true, item: page });
});

const getStructuredPage = asyncHandler(async (req, res) => {
  const pageType = req.params.pageType;
  if (!STRUCTURED_TYPES.includes(pageType)) throw createHttpError(400, "Nepodrzan tip strukturirane strane.");
  const page = await populatePage(StaticPage.findOne({ pageType }));
  if (!page) throw createHttpError(404, "Strana nije pronadjena. Pokrenite content seed ili je kreirajte u CMS-u.");
  res.json({ success: true, item: page });
});

const previewStaticPage = asyncHandler(async (req, res) => {
  const page = await populatePage(StaticPage.findById(req.params.id));
  if (!page) throw createHttpError(404, "Strana nije pronadjena.");
  res.json({ success: true, preview: true, robots: "noindex,nofollow", item: pageDto(page, req.locale || req.query.lang || "sr") });
});

const previewStructuredPage = asyncHandler(async (req, res) => {
  const pageType = req.params.pageType;
  if (!STRUCTURED_TYPES.includes(pageType)) throw createHttpError(400, "Nepodrzan tip strukturirane strane.");
  const page = await populatePage(StaticPage.findOne({ pageType }));
  if (!page) throw createHttpError(404, "Strana nije pronadjena.");
  res.json({ success: true, preview: true, robots: "noindex,nofollow", item: pageDto(page, req.locale || req.query.lang || "sr") });
});

const createStaticPage = asyncHandler(async (req, res) => {
  if (STRUCTURED_TYPES.includes(req.body.pageType)) {
    const existing = await StaticPage.findOne({ pageType: req.body.pageType }).select("_id");
    if (existing) throw createHttpError(409, "Za ovaj tip vec postoji autoritativna strana. Otvorite postojeci editor.", { id: String(existing._id) });
  }
  const page = new StaticPage(req.body);
  applyAudit(page, req.admin, { isNew: true });
  applyPublishing(page);
  await page.save();
  const item = await populatePage(StaticPage.findById(page._id));
  res.status(201).json({ success: true, item });
});

const updateStaticPage = asyncHandler(async (req, res) => {
  const page = await StaticPage.findById(req.params.id);
  if (!page) throw createHttpError(404, "Strana nije pronadjena.");
  const previousStatus = page.status;
  assignLocalizedPayload(page, req.body);
  applyAudit(page, req.admin);
  applyPublishing(page, previousStatus);
  await page.save();
  const item = await populatePage(StaticPage.findById(page._id));
  res.json({ success: true, item });
});

const updateStructuredPage = asyncHandler(async (req, res) => {
  const pageType = req.params.pageType;
  if (!STRUCTURED_TYPES.includes(pageType)) throw createHttpError(400, "Nepodrzan tip strukturirane strane.");
  const defaults = pageType === "about"
    ? { title: "O nama", slug: "o-nama" }
    : { title: "Kontakt", slug: "kontakt" };
  let page = await StaticPage.findOne({ pageType });
  const previousStatus = page?.status;
  if (!page) page = new StaticPage({ ...defaults, pageType, status: "draft" });
  assignLocalizedPayload(page, { ...req.body, pageType });
  applyAudit(page, req.admin, { isNew: page.isNew });
  applyPublishing(page, previousStatus);
  await page.save();
  const item = await populatePage(StaticPage.findById(page._id));
  res.json({ success: true, item });
});

const archiveStaticPage = asyncHandler(async (req, res) => {
  const page = await StaticPage.findById(req.params.id);
  if (!page) throw createHttpError(404, "Strana nije pronadjena.");
  page.status = "archived";
  applyAudit(page, req.admin);
  await page.save();
  res.json({ success: true, message: "Strana je arhivirana.", item: page });
});

const deleteStaticPage = asyncHandler(async (req, res) => {
  const page = await StaticPage.findById(req.params.id);
  if (!page) throw createHttpError(404, "Strana nije pronadjena.");
  if (STRUCTURED_TYPES.includes(page.pageType)) {
    throw createHttpError(409, "Strukturirana About/Contact strana ne moze biti obrisana. Arhivirajte je umesto brisanja.");
  }
  await page.deleteOne();
  res.json({ success: true, message: "Strana je obrisana." });
});

module.exports = {
  archiveStaticPage,
  createStaticPage,
  deleteStaticPage,
  getStaticPageById,
  getStaticPages,
  getStructuredPage,
  previewStaticPage,
  previewStructuredPage,
  updateStaticPage,
  updateStructuredPage,
};
