const mongoose = require("mongoose");
const slugify = require("../utils/slugify");
const { sanitizeRichText } = require("../services/richText.service");
const { VIDEO_PROVIDERS, detectVideoProvider, isValidVideoUrl } = require("../services/video.service");
const {
  auditFields,
  contentStatusField,
  galleryItemSchema,
  isHttpUrl,
  seoSchema,
} = require("./schemas/cms.schemas");

const PRODUCTION_TYPES = [
  "opera",
  "opereta",
  "balet",
  "drama",
  "mjuzikl",
  "koncert",
  "gostujuca_predstava",
  "ostalo",
];

const CREATIVE_ROLE_KEYS = [
  "writer",
  "director",
  "composer",
  "conductor",
  "choreographer",
  "dramaturg",
  "scenographer",
  "costumeDesigner",
  "lightingDesigner",
  "music",
  "other",
];

const translationSchema = new mongoose.Schema(
  {
    slug: { type: String, lowercase: true, trim: true },
    title: String,
    authorComposer: String,
    originalTitle: String,
    subtitle: String,
    shortDescription: String,
    description: String,
    synopsis: String,
    performanceLanguage: String,
    subtitles: String,
    season: String,
    tags: [String],
    announcementText: String,
    seoTitle: String,
    seoDescription: String,
  },
  { _id: false }
);

const creditSchema = new mongoose.Schema(
  {
    roleKey: { type: String, trim: true, default: "other" },
    label: { type: String, trim: true, default: "" },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    name: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    translations: {
      en: {
        label: { type: String, trim: true, default: "" },
        name: { type: String, trim: true, default: "" },
        note: { type: String, trim: true, default: "" },
      },
    },
    displayOrder: { type: Number, min: 0, default: 0 },
    // Legacy fields remain readable until the structured-content migration is complete.
    role: { type: String, trim: true, default: "" },
    order: { type: Number, min: 0 },
  },
  { _id: true }
);

const castMemberSchema = new mongoose.Schema(
  {
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    name: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    translations: {
      en: {
        name: { type: String, trim: true, default: "" },
        role: { type: String, trim: true, default: "" },
        note: { type: String, trim: true, default: "" },
      },
    },
    displayOrder: { type: Number, min: 0, default: 0 },
    // Legacy cast fields.
    character: { type: String, trim: true, default: "" },
    artists: [{ type: mongoose.Schema.Types.ObjectId, ref: "Artist" }],
    names: [{ type: String, trim: true }],
    order: { type: Number, min: 0 },
  },
  { _id: true }
);

const videoSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: VIDEO_PROVIDERS, default: "youtube" },
    url: {
      type: String,
      trim: true,
      required: [true, "Video URL je obavezan."],
      validate: {
        validator(value) {
          return isValidVideoUrl(value, this.provider);
        },
        message: "Video URL ne odgovara izabranom provajderu.",
      },
    },
    title: { type: String, trim: true, default: "" },
    translations: {
      en: { title: { type: String, trim: true, default: "" } },
    },
    thumbnail: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    isTrailer: { type: Boolean, default: false },
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    publication: { type: String, trim: true, default: "" },
    url: {
      type: String,
      trim: true,
      required: [true, "URL kritike je obavezan."],
      validate: { validator: isHttpUrl, message: "URL kritike mora koristiti HTTP ili HTTPS." },
    },
    publishedAt: Date,
    note: { type: String, trim: true, default: "" },
    translations: {
      en: {
        title: { type: String, trim: true, default: "" },
        publication: { type: String, trim: true, default: "" },
        note: { type: String, trim: true, default: "" },
      },
    },
    displayOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const announcementSchema = new mongoose.Schema(
  {
    isAnnounced: { type: Boolean, default: false },
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number, min: 2000, max: 2200 },
    text: { type: String, trim: true, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    startsAt: Date,
    endsAt: Date,
  },
  { _id: false }
);

const productionSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Naslov predstave je obavezan."], trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    type: {
      type: String,
      enum: PRODUCTION_TYPES,
      required: [true, "Tip predstave je obavezan."],
    },
    authorComposer: { type: String, trim: true, default: "" },
    originalTitle: { type: String, trim: true, default: "" },
    subtitle: { type: String, trim: true, default: "" },
    shortDescription: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    synopsis: { type: String, default: "" },
    premiereDate: Date,
    isPremiere: { type: Boolean, default: false },
    isOnRepertoire: { type: Boolean, default: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue" },
    durationMinutes: { type: Number, min: 0 },
    performanceLanguage: { type: String, trim: true, default: "" },
    subtitles: { type: String, trim: true, default: "" },
    poster: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    galleryItems: [galleryItemSchema],
    videoUrls: [{ label: String, url: String }],
    videos: [videoSchema],
    creativeTeam: [creditSchema],
    cast: [castMemberSchema],
    reviews: [reviewSchema],
    recommendedProductions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Production" }],
    announcement: { type: announcementSchema, default: () => ({}) },
    season: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
    translations: { sr: translationSchema, en: translationSchema },
    seo: { type: seoSchema, default: () => ({}) },
    status: contentStatusField,
    isFeatured: { type: Boolean, default: false },
    ...auditFields,
  },
  { timestamps: true }
);

productionSchema.pre("validate", function () {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  if (this.isModified("slug") && this.slug) this.slug = slugify(this.slug);
  if (this.translations?.en) {
    this.translations.en.slug = this.translations.en.slug ? slugify(this.translations.en.slug) : undefined;
    this.translations.en.description = sanitizeRichText(this.translations.en.description);
    this.translations.en.synopsis = sanitizeRichText(this.translations.en.synopsis);
  }

  this.description = sanitizeRichText(this.description);
  this.synopsis = sanitizeRichText(this.synopsis);

  for (const video of this.videos || []) {
    if (!video.provider && video.url) video.provider = detectVideoProvider(video.url) || "external";
  }

  const trailerCount = (this.videos || []).filter((video) => video.isTrailer).length;
  if (trailerCount > 1) this.invalidate("videos", "Samo jedan video moze biti glavni trejler.");

  const galleryIds = (this.galleryItems || []).map((item) => String(item.media));
  if (new Set(galleryIds).size !== galleryIds.length) {
    this.invalidate("galleryItems", "Ista slika ne moze biti dodata u galeriju vise puta.");
  }

  const recommendationIds = (this.recommendedProductions || []).map(String);
  if (new Set(recommendationIds).size !== recommendationIds.length) {
    this.invalidate("recommendedProductions", "Preporucene predstave ne smeju imati duplikate.");
  }
  if (this._id && recommendationIds.includes(String(this._id))) {
    this.invalidate("recommendedProductions", "Predstava ne moze preporuciti samu sebe.");
  }

  const reviewUrls = (this.reviews || []).map((item) => item.url).filter(Boolean);
  if (new Set(reviewUrls).size !== reviewUrls.length) {
    this.invalidate("reviews", "Isti link kritike ne moze biti dodat vise puta.");
  }

  for (const credit of this.creativeTeam || []) {
    const label = credit.label || credit.role;
    if (!label || (!credit.artist && !credit.name)) {
      this.invalidate("creativeTeam", "Svaki kredit mora imati ulogu i umetnika ili ime.");
      break;
    }
  }

  for (const member of this.cast || []) {
    const hasPerson = member.artist || member.name || member.artists?.length || member.names?.length;
    if (!hasPerson) {
      this.invalidate("cast", "Svaki red podele mora imati umetnika ili ime.");
      break;
    }
  }

  if (this.announcement?.startsAt && this.announcement?.endsAt && this.announcement.endsAt < this.announcement.startsAt) {
    this.invalidate("announcement.endsAt", "Kraj najave mora biti posle pocetka.");
  }
});

productionSchema.index({ status: 1, type: 1, title: 1 });
productionSchema.index({ status: 1, isFeatured: -1, updatedAt: -1 });
productionSchema.index({ season: 1, status: 1 });
productionSchema.index({ "translations.en.slug": 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Production", productionSchema, "productions");
module.exports.PRODUCTION_TYPES = PRODUCTION_TYPES;
module.exports.CREATIVE_ROLE_KEYS = CREATIVE_ROLE_KEYS;
