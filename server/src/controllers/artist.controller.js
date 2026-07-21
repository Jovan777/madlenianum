const asyncHandler = require("../utils/asyncHandler");
const Artist = require("../models/Artist");
const Production = require("../models/Production");
const { artistDto, productionSummaryDto } = require("../services/cmsDto.service");
const { populateArtist, populateProduction } = require("../services/cmsPopulate.service");
const {
  applyAudit,
  applyPublishing,
  createHttpError,
  escapeRegex,
  paginationFrom,
  sendList,
} = require("../services/cms.service");

const artistUsageFilter = (artistId) => ({
  $or: [
    { "creativeTeam.artist": artistId },
    { "cast.artist": artistId },
    { "cast.artists": artistId },
  ],
});

const getArtists = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.profession) filter.professions = new RegExp(`^${escapeRegex(req.query.profession)}$`, "i");
  if (req.query.q) {
    const search = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ displayName: search }, { professions: search }];
  }

  const [total, artists] = await Promise.all([
    Artist.countDocuments(filter),
    populateArtist(Artist.find(filter).sort(req.query.sort === "updated" ? "-updatedAt" : "displayName").skip(skip).limit(limit)),
  ]);
  sendList(res, { items: artists, total, page, limit });
});

const getArtistById = asyncHandler(async (req, res) => {
  const artist = await populateArtist(Artist.findById(req.params.id));
  if (!artist) throw createHttpError(404, "Umetnik nije pronadjen.");
  res.json({ success: true, item: artist });
});

const previewArtist = asyncHandler(async (req, res) => {
  const artist = await populateArtist(Artist.findById(req.params.id));
  if (!artist) throw createHttpError(404, "Umetnik nije pronadjen.");
  const productions = await populateProduction(Production.find(artistUsageFilter(artist._id)).sort("title"));
  res.json({
    success: true,
    preview: true,
    robots: "noindex,nofollow",
    item: { ...artistDto(artist), relatedProductions: productions.map(productionSummaryDto) },
  });
});

const createArtist = asyncHandler(async (req, res) => {
  const artist = new Artist(req.body);
  applyAudit(artist, req.admin, { isNew: true });
  applyPublishing(artist);
  await artist.save();
  const item = await populateArtist(Artist.findById(artist._id));
  res.status(201).json({ success: true, item });
});

const updateArtist = asyncHandler(async (req, res) => {
  const artist = await Artist.findById(req.params.id);
  if (!artist) throw createHttpError(404, "Umetnik nije pronadjen.");
  const previousStatus = artist.status;
  Object.assign(artist, req.body);
  applyAudit(artist, req.admin);
  applyPublishing(artist, previousStatus);
  await artist.save();
  const item = await populateArtist(Artist.findById(artist._id));
  res.json({ success: true, item });
});

const archiveArtist = asyncHandler(async (req, res) => {
  const artist = await Artist.findById(req.params.id);
  if (!artist) throw createHttpError(404, "Umetnik nije pronadjen.");
  artist.status = "archived";
  applyAudit(artist, req.admin);
  await artist.save();
  res.json({ success: true, message: "Umetnik je arhiviran.", item: artist });
});

const deleteArtist = asyncHandler(async (req, res) => {
  const artist = await Artist.findById(req.params.id);
  if (!artist) throw createHttpError(404, "Umetnik nije pronadjen.");
  const productions = await Production.find(artistUsageFilter(artist._id)).select("title slug status").limit(50).lean();
  if (productions.length) {
    throw createHttpError(409, "Umetnik je povezan sa predstavama i ne moze biti obrisan. Arhivirajte profil umesto brisanja.", {
      productions: productions.map((item) => ({ id: String(item._id), title: item.title, slug: item.slug, status: item.status })),
    });
  }
  await artist.deleteOne();
  res.json({ success: true, message: "Umetnik je obrisan." });
});

module.exports = {
  archiveArtist,
  createArtist,
  deleteArtist,
  getArtistById,
  getArtists,
  previewArtist,
  updateArtist,
};
