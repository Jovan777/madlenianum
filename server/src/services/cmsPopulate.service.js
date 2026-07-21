const populateProduction = (query) => query
  .populate("poster")
  .populate("gallery")
  .populate("galleryItems.media")
  .populate("venue")
  .populate("videos.thumbnail")
  .populate({ path: "creativeTeam.artist", populate: { path: "image" } })
  .populate({ path: "cast.artist", populate: { path: "image" } })
  .populate({ path: "cast.artists", populate: { path: "image" } })
  .populate({ path: "recommendedProductions", populate: { path: "poster" } })
  .populate("announcement.image");

const populateArtist = (query) => query
  .populate("image")
  .populate("gallery")
  .populate("galleryItems.media");

const populateNews = (query) => query
  .populate("image")
  .populate("gallery")
  .populate("galleryItems.media")
  .populate("attachment")
  .populate({ path: "relatedProduction", populate: { path: "poster" } });

const populatePage = (query) => query
  .populate("image")
  .populate("gallery")
  .populate("galleryItems.media")
  .populate("attachments")
  .populate("sections.image")
  .populate("sections.backgroundImage")
  .populate("sections.timelineItems.image")
  .populate("sections.featureItems.image")
  .populate("sections.galleryItems.media");

module.exports = {
  populateArtist,
  populateNews,
  populatePage,
  populateProduction,
};
