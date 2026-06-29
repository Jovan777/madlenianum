const mongoose = require("mongoose");
const slugify = require("../utils/slugify");

const translationSchema = new mongoose.Schema(
  {
    title: String,
    subtitle: String,
    shortDescription: String,
    description: String,
    synopsis: String,
    seoTitle: String,
    seoDescription: String,
  },
  { _id: false }
);

const creditSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    name: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const castMemberSchema = new mongoose.Schema(
  {
    character: {
      type: String,
      default: "",
    },
    artists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Artist",
      },
    ],
    names: [
      {
        type: String,
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const productionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Naslov predstave je obavezan."],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      // sifra -> konverter
      type: String,
      enum: [
        "opera",
        "opereta",
        "balet",
        "drama",
        "mjuzikl",
        "koncert",
        "gostujuca_predstava",
        "ostalo",
      ],
      required: [true, "Tip predstave je obavezan."],
    },
    authorComposer: {
      type: String,
      default: "",
    },
    originalTitle: {
      type: String,
      default: "",
    },
    subtitle: {
      type: String,
      default: "",
    },
    shortDescription: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    synopsis: {
      type: String,
      default: "",
    },
    premiereDate: Date,
    isPremiere: {
      type: Boolean,
      default: false,
    },
    isOnRepertoire: {
      type: Boolean,
      default: true,
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
    },
    durationMinutes: Number,
    performanceLanguage: {
      type: String,
      default: "",
    },
    subtitles: {
      type: String,
      default: "",
    },
    poster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },
    gallery: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    videoUrls: [
      {
        label: String,
        url: String,
      },
    ],
    creativeTeam: [creditSchema],
    cast: [castMemberSchema],
    season: {
      type: String,
      default: "",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    translations: {
      sr: translationSchema,
      en: translationSchema,
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

productionSchema.pre("validate", function () {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }
});

module.exports = mongoose.model("Production", productionSchema, "productions");
