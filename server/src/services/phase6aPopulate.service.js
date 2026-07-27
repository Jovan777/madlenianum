const populateCostume = (query) => query
  .populate("mainImage")
  .populate("gallery")
  .populate("galleryItems.media")
  .populate({ path: "relatedProduction", populate: { path: "poster" } });

const populatePropScenography = (query) => query
  .populate("mainImage")
  .populate("gallery")
  .populate("galleryItems.media")
  .populate({ path: "relatedProduction", populate: { path: "poster" } });

const populateRentalSpace = (query) => query
  .populate("heroImage")
  .populate("gallery")
  .populate("galleryItems.media")
  .populate("floorPlanPdf")
  .populate("linkedVenue");

const populateRentalInquiry = (query) => query
  .populate({
    path: "rentalSpace",
    populate: [
      { path: "heroImage" },
      { path: "galleryItems.media" },
      { path: "linkedVenue" },
    ],
  })
  .populate("statusHistory.changedBy", "username email");

const populateEventPlanningInquiry = (query) => query
  .populate({
    path: "preferredRentalSpace",
    populate: [
      { path: "heroImage" },
      { path: "galleryItems.media" },
      { path: "linkedVenue" },
    ],
  })
  .populate("statusHistory.changedBy", "username email");

module.exports = {
  populateCostume,
  populateEventPlanningInquiry,
  populatePropScenography,
  populateRentalInquiry,
  populateRentalSpace,
};
