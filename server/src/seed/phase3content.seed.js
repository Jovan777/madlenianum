const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const connectDB = require("../config/db");
const slugify = require("../utils/slugify");

const Media = require("../models/Media");
const Artist = require("../models/Artist");
const Production = require("../models/Production");
const PromoSlide = require("../models/PromoSlide");
const News = require("../models/News");
const HomepageConfig = require("../models/HomepageConfig");
const SiteSettings = require("../models/SiteSettings");
const Event = require("../models/Event");
const StaticPage = require("../models/StaticPage");
const Venue = require("../models/Venue");
const SeatMap = require("../models/SeatMap");
const Seat = require("../models/Seat");
const PricePlan = require("../models/PricePlan");
const PriceCategory = require("../models/PriceCategory");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const SeatLock = require("../models/SeatLock");

const UPLOAD_ROOT = path.join(__dirname, "../../uploads/madlenianum");

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const futurePerformance = ({ daysFromNow, hour, minute, durationMinutes }) => {
  const startsAt = startOfToday();
  startsAt.setDate(startsAt.getDate() + daysFromNow);
  startsAt.setHours(hour, minute, 0, 0);

  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  return {
    startsAt,
    endsAt,
  };
};

const eventBadge = (startsAt) => {
  return startsAt.toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "short",
  });
};

const IMAGE_PATHS = {
  main: {
    carmen: "CARMEN SUITE & BOLERO_main.jpg",
    gordost: "gordost_i_predrasude_main.jpg",
    pluca: "pluca_main.jpg",
    staklena: "STAKLENA MENAŽERIJA_main.jpg",
    xy: "X + Y = 0_main.jpg",
  },
  galleries: {
    carmen: [
      "CARMEN SUITE & BOLERO/csb_1.jpg",
      "CARMEN SUITE & BOLERO/csb_2.jpg",
      "CARMEN SUITE & BOLERO/csb_3.jpg",
    ],
    gordost: [
      "GORDOST I PREDRASUDE/gp_1.jpg",
      "GORDOST I PREDRASUDE/gp_2.jpg",
      "GORDOST I PREDRASUDE/gp_3.jpg",
    ],
    pluca: [
      "PLUCA/pluca_1.jpg",
      "PLUCA/pluca_2.jpg",
      "PLUCA/pluca_3.jpg",
    ],
    staklena: [
      "staklena_menazerija/sm_1.jpg",
      "staklena_menazerija/sm_2.jpg",
      "staklena_menazerija/sm_3.jpg",
    ],
  },
  artists: {
    tamara: "umetnici/Tamara_Aleksic.jpg",
    nikola: "umetnici/nikola_rakocevic.jpg",
    ivan: "umetnici/ivan_vukovic.jpg",
  },
};

const encodePublicUrl = (relativePath) => {
  const encodedPath = relativePath
    .split(/[\\/]/)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `/uploads/madlenianum/${encodedPath}`;
};

const getFileMeta = (relativePath) => {
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);

  if (!fs.existsSync(absolutePath)) {
    console.warn(`Missing image file: ${absolutePath}`);
    return null;
  }

  const stats = fs.statSync(absolutePath);
  const extension = path.extname(relativePath).toLowerCase();

  let mimeType = "application/octet-stream";

  if (extension === ".jpg" || extension === ".jpeg") {
    mimeType = "image/jpeg";
  }

  if (extension === ".png") {
    mimeType = "image/png";
  }

  if (extension === ".webp") {
    mimeType = "image/webp";
  }

  return {
    absolutePath,
    relativePath,
    fileName: path.basename(relativePath),
    originalName: path.basename(relativePath),
    size: stats.size,
    mimeType,
    url: encodePublicUrl(relativePath),
    storagePath: path.join("uploads", "madlenianum", relativePath).replace(/\\/g, "/"),
  };
};

const upsertMedia = async ({ relativePath, title, altText, legacyUrls = [] }) => {
  const meta = getFileMeta(relativePath);

  if (!meta) {
    return null;
  }

  let media = await Media.findOne({ url: meta.url });

  if (!media && legacyUrls.length) {
    media = await Media.findOne({ url: { $in: legacyUrls } });
  }

  media ||= new Media();
  Object.assign(media, {
    title,
    alt: altText,
    originalName: meta.originalName,
    filename: meta.fileName,
    mimeType: meta.mimeType,
    size: meta.size,
    storagePath: meta.storagePath.replace(/^uploads\//, ""),
    url: meta.url,
    fileType: "image",
  });

  return media.save();
};

const upsertMediaMany = async (items) => {
  const result = [];

  for (const item of items) {
    const media = await upsertMedia(item);

    if (media) {
      result.push(media);
    }
  }

  return result;
};

const galleryItems = (items) => (items || []).map((media, index) => ({
  media: media._id,
  caption: "",
  credit: "Madlenianum",
  altText: media.alt || media.title || "",
  displayOrder: index,
}));

const roleKeyFor = (role) => {
  const value = String(role || "").toLowerCase();
  if (value.includes("redit")) return "director";
  if (value.includes("pis") || value.includes("autor")) return "writer";
  if (value.includes("kompoz")) return "composer";
  if (value.includes("dirigent")) return "conductor";
  if (value.includes("koreograf")) return "choreographer";
  if (value.includes("muzik")) return "music";
  return "other";
};

const upsertHomepageMedia = ({ fileName, title, altText }) => upsertMedia({
  relativePath: fileName,
  title,
  altText,
  legacyUrls: [`/madlenianum/${encodeURIComponent(fileName)}`],
});

const normalizeCredits = (items) => (items || []).map((entry, index) => ({
  roleKey: entry.roleKey || roleKeyFor(entry.label || entry.role),
  label: entry.label || entry.role || "Saradnik",
  artist: entry.artist,
  name: entry.name || "",
  note: entry.note || "",
  displayOrder: entry.displayOrder ?? entry.order ?? index,
}));

const normalizeCast = (items) => (items || []).flatMap((entry, index) => {
  if (entry.artist || entry.name) {
    return [{
      artist: entry.artist,
      name: entry.name || "",
      role: entry.role || entry.character || "",
      note: entry.note || "",
      displayOrder: entry.displayOrder ?? entry.order ?? index,
    }];
  }

  const artists = entry.artists || [];
  const names = entry.names || [];
  const count = Math.max(artists.length, names.length, 1);
  return Array.from({ length: count }, (_, personIndex) => ({
    artist: artists[personIndex],
    name: names[personIndex] || "",
    role: entry.character || "",
    note: entry.note || "",
    displayOrder: (entry.order ?? index) + personIndex,
  }));
});

const upsertArtist = async ({ displayName, professions, biography, image, gallery = [], links = [] }) => {
  const slug = slugify(displayName);

  return Artist.findOneAndUpdate(
    { slug },
    {
      displayName,
      slug,
      professions,
      biography,
      image: image?._id,
      gallery: gallery.map((item) => item._id),
      galleryItems: galleryItems(gallery),
      links: links.map((item, index) => ({ ...item, displayOrder: index })),
      translations: {},
      status: "published",
      publishedAt: new Date(),
      seo: {
        title: `${displayName} | Madlenianum`,
        description: biography.slice(0, 155),
        keywords: ["Madlenianum", ...professions],
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );
};

const getRequiredBaseData = async () => {
  const venue = await Venue.findOne({ slug: "velika-scena" });

  if (!venue) {
    throw new Error("Velika scena was not found. Run npm run seed:phase2a first.");
  }

  const seatMap = await SeatMap.findOne({
    venue: venue._id,
    slug: "velika-scena-2025-2026",
  });

  if (!seatMap) {
    throw new Error("SeatMap for Velika scena was not found. Run npm run seed:phase2a first.");
  }

  const dramaRegularPlan = await PricePlan.findOne({
    name: "Drama - Velika scena - regular",
  }).populate("rules.priceCategory");

  const balletRegularPlan = await PricePlan.findOne({
    name: "Opera, opereta i balet - Velika scena - regular",
  }).populate("rules.priceCategory");

  if (!dramaRegularPlan || !balletRegularPlan) {
    throw new Error("Required price plans were not found. Run npm run seed:phase2a first.");
  }

  return {
    venue,
    seatMap,
    dramaRegularPlan,
    balletRegularPlan,
  };
};

const upsertProduction = async ({
  title,
  type,
  authorComposer,
  originalTitle,
  subtitle,
  shortDescription,
  description,
  synopsis,
  poster,
  gallery,
  creativeTeam,
  cast,
  tags,
  isFeatured,
  videos = [],
  reviews = [],
  durationMinutes = 90,
}) => {
  const slug = slugify(title);

  const payload = {
    title,
    slug,
    type,
    authorComposer,
    originalTitle: originalTitle || "",
    subtitle: subtitle || "",
    shortDescription,
    description,
    synopsis: synopsis || "",
    premiereDate: null,
    isPremiere: false,
    isOnRepertoire: true,
    durationMinutes,
    performanceLanguage: "sr",
    subtitles: "",
    poster: poster?._id,
    gallery: gallery.map((item) => item._id),
    galleryItems: galleryItems(gallery),
    videoUrls: videos.map((item) => ({ label: item.title, url: item.url })),
    videos,
    creativeTeam: normalizeCredits(creativeTeam),
    cast: normalizeCast(cast),
    reviews,
    season: "2025/2026",
    tags,
    translations: {},
    seo: {
      title: `${title} | Madlenianum`,
      description: shortDescription,
      keywords: ["Madlenianum", title, type],
    },
    status: "published",
    publishedAt: new Date(),
    isFeatured,
  };

  return Production.findOneAndUpdate(
    { slug },
    payload,
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );
};

const upsertEvent = async ({
  production,
  venue,
  seatMap,
  pricePlan,
  startsAt,
  endsAt,
  badge,
  notes,
  isPremiere = false,
  saleStatus = "on_sale",
  status = "scheduled",
  ticketingEnabled = true,
}) => {
  const saleStartsAt = startsAt > new Date()
    ? startOfToday()
    : new Date(startsAt.getTime() - 30 * 24 * 60 * 60 * 1000);
  const saleEndsAt = new Date(startsAt.getTime() - 30 * 60 * 1000);

  const event = await Event.findOneAndUpdate(
    {
      production: production._id,
      notes,
    },
    {
      production: production._id,
      venue: venue._id,
      startsAt,
      endsAt,
      isPremiere,
      badge: badge || "",
      status,
      saleStatus,
      seatMap: seatMap._id,
      pricePlan: pricePlan._id,
      saleStartsAt,
      saleEndsAt,
      maxTicketsPerOrder: 4,
      lockDurationMinutes: 15,
      ticketing: {
        enabled: ticketingEnabled,
        provider: "internal",
        legacyEventId: "",
        externalCheckoutUrl: "",
        note: "Internal ticketing seed. Provider can later be switched if needed.",
      },
      basePrice: {
        amount: 0,
        currency: "RSD",
      },
      notes,
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );

  await Event.deleteMany({
    production: production._id,
    notes,
    _id: { $ne: event._id },
  });

  return Event.findById(event._id)
    .populate("production")
    .populate("venue")
    .populate("seatMap")
    .populate({
      path: "pricePlan",
      populate: [{ path: "rules.priceCategory" }],
    });
};

const upsertPromoSlide = async ({
  title,
  subtitle,
  image,
  production,
  event,
  activeFrom,
  activeUntil,
}) => {
  const slug = slugify(title);

  return PromoSlide.findOneAndUpdate(
    { slug },
    {
      title,
      slug,
      description: subtitle || "",
      image: image?._id,
      linkLabel: "Pogledajte više",
      linkUrl: production ? `/predstave/${production.slug}` : "",
      relatedProduction: production?._id,
      relatedEvent: event?._id,
      activeFrom: activeFrom || new Date(Date.now() - 24 * 60 * 60 * 1000),
      activeUntil: activeUntil || (event?.startsAt ? new Date(event.startsAt.getTime() + 24 * 60 * 60 * 1000) : undefined),
      language: "sr",
      status: "published",
      publishedAt: new Date(),
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );
};

const upsertStaticPage = async ({
  title,
  slug,
  body,
  pageType,
  image,
  sections = [],
  contact = {},
}) => {
  return StaticPage.findOneAndUpdate(
    { slug },
    {
      title,
      slug,
      body,
      pageType,
      image: image?._id,
      gallery: [],
      galleryItems: [],
      attachments: [],
      sections,
      contact,
      translations: {},
      seo: {
        title: `${title} | Madlenianum`,
        description: body.slice(0, 150),
        keywords: ["Madlenianum", title],
      },
      status: "published",
      publishedAt: new Date(),
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );
};

const upsertNews = async ({ title, subtitle, excerpt, body, image, gallery, relatedProduction, category = "vest" }) => {
  const slug = slugify(title);
  return News.findOneAndUpdate(
    { slug },
    {
      title,
      slug,
      subtitle,
      excerpt,
      body,
      category,
      image: image?._id,
      gallery: (gallery || []).map((item) => item._id),
      galleryItems: galleryItems(gallery),
      externalLinks: [{
        label: "Program Madlenianuma",
        url: "https://madlenianum.rs/",
        type: "website",
        displayOrder: 0,
      }],
      relatedProduction: relatedProduction?._id,
      publishedAt: new Date(),
      status: "published",
      isFeatured: true,
      seo: {
        title: `${title} | Madlenianum`,
        description: excerpt,
        keywords: ["Madlenianum", "premijera", relatedProduction?.title].filter(Boolean),
      },
    },
    { returnDocument: "after", upsert: true, runValidators: true }
  );
};

const upsertHomepageConfig = async ({ slides, events, productions, featuredProductions, news, teaserImage, aboutPage, ctaCards }) => {
  return HomepageConfig.findOneAndUpdate(
    { key: "default" },
    {
      key: "default",
      hero: { enabled: true, mode: "manual", limit: 5, selectedSlides: slides.map((item) => item._id), fallbackToAutomatic: true },
      upcomingEvents: { enabled: true, mode: "manual", heading: "Predstojeći događaji", limit: 8, selectedEvents: events.map((item) => item._id) },
      repertoireProductions: { enabled: true, mode: "manual", heading: "Šta je na repertoaru", limit: 4, selectedProductions: productions.map((item) => item._id), allowedTypes: [] },
      featuredProductions: { enabled: true, mode: "manual", heading: "Ne propustite", limit: 6, selectedProductions: featuredProductions.map((item) => item._id), allowedTypes: [] },
      featuredNews: { enabled: true, mode: "manual", heading: "Iza kulisa", limit: 6, selectedNews: news.map((item) => item._id), category: "" },
      institutionalTeaser: {
        enabled: true,
        heading: "Madlenianum",
        text: "<p>Madlenianum je mesto susreta opere, teatra, muzike i pokreta. U Zemunu stvaramo program koji povezuje umetnike i publiku, tradiciju i savremeni izraz.</p>",
        image: teaserImage?._id,
        ctaLabel: "O nama",
        ctaUrl: "/strana/o-nama",
        linkedPage: aboutPage?._id,
      },
      ctaCardsHeading: "Partnerstvo",
      ctaCards,
      sections: [
        { sectionType: "hero", enabled: true, displayOrder: 0 },
        { sectionType: "upcomingEvents", enabled: true, displayOrder: 1 },
        { sectionType: "repertoireProductions", enabled: true, displayOrder: 2 },
        { sectionType: "featuredProductions", enabled: true, displayOrder: 3 },
        { sectionType: "featuredNews", enabled: true, displayOrder: 4 },
        { sectionType: "institutionalTeaser", enabled: true, displayOrder: 5 },
        { sectionType: "ctaCards", enabled: true, displayOrder: 6 },
      ],
      seo: { title: "Madlenianum", description: "Opera i teatar Madlenianum u Zemunu", keywords: ["Madlenianum", "opera", "teatar"] },
    },
    { returnDocument: "after", upsert: true, runValidators: true }
  );
};

const upsertSiteSettings = async ({ socialImage }) => {
  return SiteSettings.findOneAndUpdate(
    { key: "default" },
    {
      key: "default",
      siteName: "Madlenianum",
      shortDescription: "Opera i teatar Madlenianum u Zemunu.",
      mainLogo: null,
      footerLogo: null,
      contact: {
        address: "Glavna 32, Zemun, Beograd",
        generalEmail: "office@madlenianum.rs",
        ticketOfficeEmail: "biletarnica@madlenianum.rs",
        phones: ["+381 11 316 27 20"],
        ticketOfficePhones: ["+381 11 316 27 20"],
      },
      socialLinks: [
        { platform: "instagram", label: "Instagram", url: "https://www.instagram.com/madlenianum/", enabled: true, displayOrder: 0 },
      ],
      legalLinks: [],
      footerNavigation: [
        {
          title: "Program",
          enabled: true,
          displayOrder: 0,
          links: [
            { label: "Repertoar", url: "/repertoar", enabled: true, displayOrder: 0 },
            { label: "Predstave", url: "/predstave", enabled: true, displayOrder: 1 },
          ],
        },
        {
          title: "Umetnici",
          enabled: true,
          displayOrder: 1,
          links: [{ label: "Svi umetnici", url: "/umetnici", enabled: true, displayOrder: 0 }],
        },
        {
          title: "Madlenianum",
          enabled: true,
          displayOrder: 2,
          links: [
            { label: "O nama", url: "/strana/o-nama", enabled: true, displayOrder: 0 },
            { label: "Kontakt", url: "/strana/kontakt", enabled: true, displayOrder: 1 },
            { label: "Provera porudzbine", url: "/porudzbina", enabled: true, displayOrder: 2 },
          ],
        },
      ],
      partnerLogos: [],
      defaultSeo: { title: "Madlenianum", description: "Opera i teatar Madlenianum", keywords: ["Madlenianum", "Zemun"] },
      socialImage: socialImage?._id,
      languages: ["sr", "en"],
      defaultLanguage: "sr",
      maintenanceMessage: "",
    },
    { returnDocument: "after", upsert: true, runValidators: true }
  );
};

const upsertCustomer = async ({ fullName, email, phone, city }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await Customer.hashPassword("Customer123!");

  return Customer.findOneAndUpdate(
    { email: normalizedEmail },
    {
      fullName,
      email: normalizedEmail,
      passwordHash,
      address: "Pozorisni trg 1",
      postalCode: "11000",
      city,
      country: "Srbija",
      phone,
      newsletterConsent: true,
      language: "sr",
      status: "active",
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );
};

const getSeatPrice = (seat, pricePlan) => {
  if (!seat.priceCategory || !pricePlan?.rules) {
    return null;
  }

  const seatCategoryId = String(seat.priceCategory._id || seat.priceCategory);

  let rule = pricePlan.rules.find((item) => {
    const ruleCategoryId = String(item.priceCategory?._id || item.priceCategory);
    return ruleCategoryId === seatCategoryId;
  });

  if (!rule) {
    rule = pricePlan.rules.find((item) => item.priceCategory?.code === "ALL");
  }

  if (!rule) {
    return null;
  }

  return {
    amount: rule.amount,
    currency: pricePlan.currency || "RSD",
    priceCategory: seat.priceCategory,
  };
};

const findSeatsByLabels = async ({ seatMap, labels }) => {
  const seats = await Seat.find({
    seatMap: seatMap._id,
    label: { $in: labels },
    isSellable: true,
    isActive: true,
  }).populate("priceCategory");

  const foundLabels = new Set(seats.map((seat) => seat.label));
  const missingLabels = labels.filter((label) => !foundLabels.has(label));

  if (missingLabels.length > 0) {
    throw new Error(`Missing seats: ${missingLabels.join(", ")}`);
  }

  return labels.map((label) => seats.find((seat) => seat.label === label));
};

const deleteExistingSeedOrder = async (orderCode) => {
  const existingOrder = await Order.findOne({ orderCode });

  if (!existingOrder) {
    return;
  }

  await OrderItem.deleteMany({ order: existingOrder._id });
  await SeatLock.deleteMany({ order: existingOrder._id });
  await existingOrder.deleteOne();
};

const createSeedOrder = async ({
  orderCode,
  customer,
  event,
  seatMap,
  seatLabels,
  status,
}) => {
  await deleteExistingSeedOrder(orderCode);

  const seats = await findSeatsByLabels({
    seatMap,
    labels: seatLabels,
  });

  const expiresAt =
    status === "reserved"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : undefined;

  let subtotalAmount = 0;

  const order = await Order.create({
    orderCode,
    customer: customer._id,
    customerSnapshot: {
      fullName: customer.fullName,
      email: customer.email,
      address: customer.address,
      postalCode: customer.postalCode,
      city: customer.city,
      country: customer.country,
      phone: customer.phone,
    },
    sessionId: "",
    event: event._id,
    items: [],
    subtotalAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    currency: event.pricePlan?.currency || "RSD",
    status,
    paymentStatus: status === "paid" ? "paid" : "unpaid",
    paymentProvider: status === "paid" ? "manual" : "none",
    expiresAt,
    paidAt: status === "paid" ? new Date() : undefined,
    notes: "[seed:phase3content] Seeded order.",
  });

  const orderItemsPayload = seats.map((seat) => {
    const price = getSeatPrice(seat, event.pricePlan);

    if (!price) {
      throw new Error(`Seat ${seat.label} does not have a valid price.`);
    }

    subtotalAmount += price.amount;

    return {
      order: order._id,
      event: event._id,
      seat: seat._id,
      seatLabel: seat.label,
      section: seat.section,
      row: seat.row,
      number: seat.number,
      priceCategory: seat.priceCategory?._id,
      priceCategoryCode: seat.priceCategory?.code || "",
      priceCategoryName: seat.priceCategory?.name || "",
      unitPrice: price.amount,
      discountAmount: 0,
      finalPrice: price.amount,
      currency: price.currency,
      status,
    };
  });

  const orderItems = await OrderItem.insertMany(orderItemsPayload);

  order.items = orderItems.map((item) => item._id);
  order.subtotalAmount = subtotalAmount;
  order.totalAmount = subtotalAmount;
  await order.save();

  return order;
};

const createSeedLock = async ({ event, seatMap, seatLabels, sessionId }) => {
  await SeatLock.deleteMany({
    event: event._id,
    sessionId,
  });

  const seats = await findSeatsByLabels({
    seatMap,
    labels: seatLabels,
  });

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const locks = [];

  for (const seat of seats) {
    const lock = await SeatLock.create({
      event: event._id,
      seat: seat._id,
      sessionId,
      expiresAt,
      status: "active",
    });

    locks.push(lock);
  }

  return locks;
};

const seedPhase3Content = async () => {
  try {
    await connectDB();

    if (!fs.existsSync(UPLOAD_ROOT)) {
      throw new Error(
        `Upload folder was not found: ${UPLOAD_ROOT}. Copy images to server/uploads/madlenianum first.`
      );
    }

    const {
      venue,
      seatMap,
      dramaRegularPlan,
      balletRegularPlan,
    } = await getRequiredBaseData();

    const media = {
      main: {
        carmen: await upsertMedia({
          relativePath: IMAGE_PATHS.main.carmen,
          title: "CARMEN SUITE & BOLERO main",
          altText: "CARMEN SUITE & BOLERO",
        }),
        gordost: await upsertMedia({
          relativePath: IMAGE_PATHS.main.gordost,
          title: "GORDOST I PREDRASUDE main",
          altText: "GORDOST I PREDRASUDE",
        }),
        pluca: await upsertMedia({
          relativePath: IMAGE_PATHS.main.pluca,
          title: "PLUĆA main",
          altText: "PLUĆA",
        }),
        staklena: await upsertMedia({
          relativePath: IMAGE_PATHS.main.staklena,
          title: "STAKLENA MENAŽERIJA main",
          altText: "STAKLENA MENAŽERIJA",
        }),
        xy: await upsertMedia({
          relativePath: IMAGE_PATHS.main.xy,
          title: "X + Y = 0 main",
          altText: "X + Y = 0",
        }),
      },
      gallery: {
        carmen: await upsertMediaMany(
          IMAGE_PATHS.galleries.carmen.map((relativePath, index) => ({
            relativePath,
            title: `CARMEN SUITE & BOLERO gallery ${index + 1}`,
            altText: `CARMEN SUITE & BOLERO ${index + 1}`,
          }))
        ),
        gordost: await upsertMediaMany(
          IMAGE_PATHS.galleries.gordost.map((relativePath, index) => ({
            relativePath,
            title: `GORDOST I PREDRASUDE gallery ${index + 1}`,
            altText: `GORDOST I PREDRASUDE ${index + 1}`,
          }))
        ),
        pluca: await upsertMediaMany(
          IMAGE_PATHS.galleries.pluca.map((relativePath, index) => ({
            relativePath,
            title: `PLUĆA gallery ${index + 1}`,
            altText: `PLUĆA ${index + 1}`,
          }))
        ),
        staklena: await upsertMediaMany(
          IMAGE_PATHS.galleries.staklena.map((relativePath, index) => ({
            relativePath,
            title: `STAKLENA MENAŽERIJA gallery ${index + 1}`,
            altText: `STAKLENA MENAŽERIJA ${index + 1}`,
          }))
        ),
      },
      artists: {
        tamara: await upsertMedia({
          relativePath: IMAGE_PATHS.artists.tamara,
          title: "Tamara Aleksić",
          altText: "Tamara Aleksić",
        }),
        nikola: await upsertMedia({
          relativePath: IMAGE_PATHS.artists.nikola,
          title: "Nikola Rakočević",
          altText: "Nikola Rakočević",
        }),
        ivan: await upsertMedia({
          relativePath: IMAGE_PATHS.artists.ivan,
          title: "Ivan Vuković",
          altText: "Ivan Vuković",
        }),
      },
      homepage: {
        gospodinPoster: await upsertHomepageMedia({ fileName: "gospodin_u_cizmama_od_dima.jpg", title: "Gospodin u čizmama od dima - plakat", altText: "Plakat predstave Gospodin u čizmama od dima" }),
        gospodinFeature: await upsertHomepageMedia({ fileName: "gospodin_u_cizmama_od_dima_u_najavi.jpg", title: "Gospodin u čizmama od dima", altText: "Scena iz predstave Gospodin u čizmama od dima" }),
        pariskiPoster: await upsertHomepageMedia({ fileName: "pariski_zivot_plakat.jpg", title: "Pariski život - plakat", altText: "Plakat predstave Pariski život" }),
        pariskiFeature: await upsertHomepageMedia({ fileName: "pariski_zivotu_u_najavi.jpg", title: "Pariski život", altText: "Scena iz predstave Pariski život" }),
        companyPoster: await upsertHomepageMedia({ fileName: "plakat_company.jpg", title: "Company - plakat", altText: "Plakat mjuzikla Company" }),
        novaLjubavPoster: await upsertHomepageMedia({ fileName: "plakat_nova_ljubav.jpg", title: "Nova ljubav - plakat", altText: "Plakat predstave Nova ljubav" }),
        novaLjubavFeature: await upsertHomepageMedia({ fileName: "nova_ljubav_u_najavi.jpg", title: "Nova ljubav", altText: "Scena iz predstave Nova ljubav" }),
        staklenaPoster: await upsertHomepageMedia({ fileName: "plakat_staklena_menazerija.jpg", title: "Staklena menazerija - plakat", altText: "Plakat predstave Staklena menazerija" }),
        staklenaFeature: await upsertHomepageMedia({ fileName: "staklena_menazerija_u_najavi.jpg", title: "Staklena menazerija", altText: "Scena iz predstave Staklena menazerija" }),
        building: await upsertHomepageMedia({ fileName: "madlenianum_zgrada.jpg", title: "Zgrada Madlenianuma", altText: "Zgrada opere i teatra Madlenianum" }),
        guestPerformances: await upsertHomepageMedia({ fileName: "gostovanja_slika.jpg", title: "Gostovanja", altText: "Velika scena Madlenianuma" }),
        venueRental: await upsertHomepageMedia({ fileName: "zakup_prostora_slika.jpg", title: "Zakup prostora", altText: "Prostor Madlenianuma" }),
        costumeRental: await upsertHomepageMedia({ fileName: "najam_kostima_i_rekvizita.jpg", title: "Najam kostima i rekvizita", altText: "Scena sa kostimima i rekvizitima" }),
      },
    };

    const artists = {
      tamara: await upsertArtist({
        displayName: "Tamara Aleksić",
        professions: ["glumica"],
        biography:
          "Tamara Aleksić je umetnica povezana sa repertoarom Madlenianuma i dramskim naslovima aktuelne sezone.",
        image: media.artists.tamara,
        gallery: media.gallery.staklena.slice(0, 2),
        links: [{ label: "Instagram", url: "https://www.instagram.com/", type: "instagram" }],
      }),
      nikola: await upsertArtist({
        displayName: "Nikola Rakočević",
        professions: ["glumac"],
        biography:
          "Nikola Rakočević je umetnik povezan sa repertoarom Madlenianuma i savremenim pozorišnim izrazom.",
        image: media.artists.nikola,
        gallery: media.gallery.gordost.slice(0, 2),
        links: [{ label: "Biografija", url: "https://madlenianum.rs/", type: "website" }],
      }),
      ivan: await upsertArtist({
        displayName: "Ivan Vuković",
        professions: ["reditelj"],
        biography:
          "Ivan Vuković je reditelj povezan sa predstavama na repertoaru Madlenianuma i radom ansambla.",
        image: media.artists.ivan,
        gallery: media.gallery.pluca.slice(0, 2),
        links: [{ label: "Madlenianum", url: "https://madlenianum.rs/", type: "website" }],
      }),
    };

    const staklena = await upsertProduction({
      title: "STAKLENA MENAŽERIJA",
      type: "drama",
      authorComposer: "Tenesi Vilijams",
      subtitle: "Drama o krhkosti snova",
      shortDescription:
        "Delimično autobiografska drama Tenesija Vilijamsa o usamljenosti, snovima i potrebi za razumevanjem.",
      description:
        "STAKLENA MENAŽERIJA je delimično autobiografska drama velikog autora Tenesija Vilijamsa, u kojoj je u centru pažnje nežna i krhka Lora Vingfild. Njena dobrota i čistota izdvajaju je iz sveta u kojem živi, kao nešto retko i gotovo zaboravljeno. Lora pronalazi utehu u svojoj kolekciji staklenih figurica, posebno u jednorogu, koji simbolizuje njenu posebnost. Kada upozna Džima, javlja se nada za ljubav, ali on ne uspeva da razume dubinu njenog unutrašnjeg sveta. Njen život je povučen i skroman, ograničen na mali krug ljudi – majku Amandu i brata Toma. Upravo kroz tu intimnu porodičnu priču, drama govori o usamljenosti, snovima i potrebi za razumevanjem. I danas, više od 80 godina kasnije, STAKLENA MENAŽERIJA ostaje snažna i aktuelna priča koja podseća na važnost dobrote, nežnosti i prihvatanja različitosti.",
      synopsis:
        "Intimna porodična priča o Lori Vingfild, njenim snovima, krhkosti i potrebi za prihvatanjem.",
      poster: media.main.staklena,
      gallery: media.gallery.staklena,
      creativeTeam: [
        {
          role: "Reditelj",
          name: "Ivana Vujić",
          order: 1,
        },
        {
          role: "Pisac",
          name: "Tenesi Vilijams",
          order: 2,
        },
      ],
      cast: [
        {
          character: "Uloga",
          artists: [artists.tamara._id],
          names: ["Tamara Aleksić"],
          order: 1,
        },
        {
          character: "Uloga",
          artists: [artists.nikola._id],
          names: ["Nikola Rakočević"],
          order: 2,
        },
        {
          character: "Uloga",
          names: ["Borjanka Ljumović"],
          order: 3,
        },
        {
          character: "Uloga",
          names: ["Ognjen Malušić"],
          order: 4,
        },
      ],
      tags: ["drama", "tenesi vilijams", "velika scena"],
      isFeatured: true,
    });

    const gordost = await upsertProduction({
      title: "GORDOST I PREDRASUDE",
      type: "drama",
      authorComposer: "Džejn Ostin / dramatizacija",
      subtitle: "Klasik u novom ruhu",
      shortDescription:
        "Savremen, duhovit pogled na čuvenu priču o porodici Benet, ljubavi i društvenim predrasudama.",
      description:
        "Zaboravite klasičnu adaptaciju čuvenog romana Džejn Ostin jer Mekarturova dramatizacija donosi svež, savremeni pogled na čuvenu priču o porodici Benet. Predstava je zamišljena kao rasprava služavki koje komentarišu romantičnu radnju i zdušno glume glavne aktere priče o porodici Benet i njihovih pet neudatih ćerki. „Gordost i predrasude“ u Madlenianumu donosi spoj klasične priče, britanskog humora i savremenog pogleda na društvene predrasude – uz poruku da ih i danas moramo razbijati.",
      synopsis:
        "Duhovita dramatizacija klasika Džejn Ostin kroz savremeni pogled na ljubav, status i predrasude.",
      poster: media.main.gordost,
      gallery: media.gallery.gordost,
      creativeTeam: [
        {
          role: "Reditelj",
          artist: artists.ivan._id,
          name: "Ivan Vuković",
          order: 1,
        },
      ],
      cast: [
        {
          character: "Uloga",
          names: ["Ljubinka Klarić"],
          order: 1,
        },
        {
          character: "Uloga",
          names: ["Bojana Stefanović"],
          order: 2,
        },
        {
          character: "Uloga",
          names: ["Suzana Lukić"],
          order: 3,
        },
        {
          character: "Uloga",
          names: ["Milena Živanović"],
          order: 4,
        },
        {
          character: "Uloga",
          artists: [artists.tamara._id],
          names: ["Tamara Aleksić"],
          order: 5,
        },
        {
          character: "Uloga",
          names: ["Borjanka Ljumović"],
          order: 6,
        },
        {
          character: "Darsi",
          names: ["Goran Jevtić"],
          order: 7,
        },
      ],
      tags: ["drama", "džejn ostin", "velika scena"],
      isFeatured: true,
    });

    const carmen = await upsertProduction({
      title: "CARMEN SUITE & BOLERO",
      type: "balet",
      authorComposer: "Žorž Bize / Moris Ravel",
      subtitle: "Doživite balet kao nikad pre",
      shortDescription:
        "Savremena baletska interpretacija muzičkih remek-dela Carmen Suite i Bolero.",
      description:
        "Briljantna predstava savremenog baleta „Carmen Suite & Bolero“ vraća se na repertoar na Veliku scenu Madlenianuma. Koreograf Aleksandar Ilić donosi savremenu interpretaciju dva muzička remek-dela – „Carmen Suite“ prema čuvenoj operi „Karmen“ francuskog kompozitora Žorža Bizea u adaptaciji Rodiona Ščedrina, kao i „Bolero“ Morisa Ravela. Koreograf uspeva da operu pretvori u balet i da vokalno delo preraste u kompletno igrački spektakl uz muzičku podlogu.",
      synopsis:
        "Savremeni baletski spektakl inspirisan delima Carmen Suite i Bolero.",
      poster: media.main.carmen,
      gallery: media.gallery.carmen,
      creativeTeam: [
        {
          role: "Koreograf",
          name: "Aleksandar Ilić",
          order: 1,
        },
        {
          role: "Muzika",
          name: "Žorž Bize / Moris Ravel",
          order: 2,
        },
      ],
      cast: [],
      tags: ["balet", "carmen", "bolero", "velika scena"],
      isFeatured: true,
      videos: [{
        provider: "youtube",
        url: "https://www.youtube.com/watch?v=madlenianum-carmen",
        title: "Carmen Suite & Bolero - trejler",
        thumbnail: media.main.carmen?._id,
        isTrailer: true,
        displayOrder: 0,
      }],
      reviews: [{
        title: "Baletski program Madlenianuma",
        publication: "Madlenianum",
        url: "https://madlenianum.rs/",
        note: "Primer spoljnog linka za proveru CMS polja.",
        displayOrder: 0,
      }],
    });

    const pluca = await upsertProduction({
      title: "PLUĆA",
      type: "drama",
      authorComposer: "Dankan Makmilan",
      subtitle: "Drama o svima nama",
      shortDescription:
        "Drama o generaciji koja pokušava da bude dobra dok svet oko nje postaje sve komplikovaniji.",
      description:
        "PLUĆA britanskog autora Dankana Makmilana nisu samo drama o dvoje ljudi. To je drama o svima nama. O generaciji koja se guši u protivrečnim informacijama, u nesigurnosti, u pokušaju da bude „dobra“ dok svet oko nje postaje sve komplikovaniji. U devedeset minuta, pred publikom se odvija ceo jedan odnos – od prvog razgovora o roditeljstvu, preko trudnoće, gubitka, neverstva, pomirenja, do starosti. Bez pauze, bez predaha, baš kao što dišemo. Njihove replike su duhovite, bolne, lucidne i prepoznatljive. Njihova borba je naša borba.",
      synopsis:
        "Intimna drama o odnosu dvoje ljudi, roditeljstvu, odgovornosti, gubitku i pitanjima savremenog sveta.",
      poster: media.main.pluca,
      gallery: media.gallery.pluca,
      creativeTeam: [
        {
          role: "Reditelj",
          artist: artists.ivan._id,
          name: "Ivan Vuković",
          order: 1,
        },
        {
          role: "Pisac",
          name: "Dankan Makmilan",
          order: 2,
        },
      ],
      cast: [
        {
          character: "Uloga",
          names: ["Suzana Lukić"],
          order: 1,
        },
        {
          character: "Uloga",
          names: ["Goran Jevtić"],
          order: 2,
        },
      ],
      tags: ["drama", "dankan makmilan", "velika scena"],
      isFeatured: true,
    });

    const xy = await upsertProduction({
      title: "X + Y = 0",
      type: "drama",
      authorComposer: "",
      subtitle: "Savremena scena",
      shortDescription:
        "Savremena predstava o odnosima, izborima i tišini između dve osobe.",
      description:
        "X + Y = 0 istražuje intimni prostor savremenog para, njihove odluke i krhku ravnotežu između bliskosti i distance.",
      synopsis:
        "Kamerna drama za publiku koja voli savremeni tekst i precizan glumački izraz.",
      poster: media.main.xy,
      gallery: [],
      creativeTeam: [],
      cast: [],
      tags: ["drama", "savremeno"],
      isFeatured: false,
    });

    const gospodin = await upsertProduction({
      title: "Gospodin u čizmama od dima",
      type: "drama",
      authorComposer: "F. M. Dostojevski / Marko Misiraca",
      subtitle: "Po motivima pripovetke Selo Stepančikovo i njegovi žitelji",
      shortDescription: "Velika ansambl predstava o vlasti, sujeti i ljudskoj potrebi da bude prihvaćen.",
      description: "<p>Prva dramska premijera u Operi i teatru Madlenianum otvara scenski svet Dostojevskog kroz zajednicu koja pokusava da sacuva privid reda dok se pred njom pojavljuje neobicni gospodar sopstvenih slabosti.</p><p>GOSPODIN U CIZMAMA OD DIMA spaja britak humor, apsurd i prepoznatljivu ljudsku potrebu za prihvatanjem. U centru price su odnosi moci, sujete i zanosa, ali i pitanje koliko daleko covek ide da bi bio voljen, priznat ili bar primecen.</p><p>Rediteljski rukopis predstavu gradi kao ansambl igru u kojoj se komedija i nelagoda neprestano dodiruju, pa Dostojevski ostaje ziv, savremen i uzbudljiv za danasnju publiku.</p>",
      synopsis: "Dolazak jednog neobicnog gospodina pokrece niz odnosa i sukoba u zajednici koja pokusava da sacuva privid reda.",
      poster: media.homepage.gospodinPoster,
      gallery: [media.homepage.gospodinFeature].filter(Boolean),
      creativeTeam: [
        { role: "Tekst", name: "Marko Misiraca", order: 0 },
        { role: "Reditelj", name: "Marko Misiraca", order: 1 },
      ],
      cast: [
        { character: "Foma Fomic", name: "Tihomir Stanic", order: 0 },
        { character: "Gospodja", artists: [artists.tamara._id], names: ["Tamara Aleksic"], order: 1 },
        { character: "Mizincikov", artists: [artists.nikola._id], names: ["Nikola Rakocevic"], order: 2 },
        { character: "Gost", name: "Sasa Torlakovic", order: 3 },
      ],
      tags: ["drama", "dostojevski", "velika scena"],
      isFeatured: true,
      durationMinutes: 150,
    });

    const pariski = await upsertProduction({
      title: "Pariski život",
      type: "opereta",
      authorComposer: "Zak Ofenbah",
      subtitle: "Opereta u velikom stilu",
      shortDescription: "Vedra, raskošna opereta o gradu svetlosti, ljubavi i uzbuđenju novog početka.",
      description: "Pariski život donosi muziku, pokret i scenski sjaj u velikom ansambl spektaklu Madlenianuma.",
      synopsis: "Gosti i domacini Pariza uplestace se u vrtlog zabune, ljubavi i muzike.",
      poster: media.homepage.pariskiPoster,
      gallery: [media.homepage.pariskiFeature].filter(Boolean),
      creativeTeam: [{ role: "Kompozitor", name: "Zak Ofenbah", order: 0 }],
      cast: [],
      tags: ["opereta", "muzicki program", "velika scena"],
      isFeatured: true,
    });

    const company = await upsertProduction({
      title: "Company",
      type: "mjuzikl",
      authorComposer: "Stiven Sondhajm",
      subtitle: "Savremeni brodvejski mjuzikl",
      shortDescription: "Muzicka prica o odnosima, prijateljstvu i izborima koji oblikuju savremeni zivot.",
      description: "Company kroz muziku i precizne dijaloge posmatra ljubav, brak i slobodu iz vise uglova.",
      synopsis: "Jedan rodjendan otvara pitanja bliskosti i odluka koje se ne mogu zauvek odlagati.",
      poster: media.homepage.companyPoster,
      gallery: [],
      creativeTeam: [{ role: "Kompozitor", name: "Stiven Sondhajm", order: 0 }],
      cast: [],
      tags: ["mjuzikl", "velika scena"],
      isFeatured: false,
    });

    const novaLjubav = await upsertProduction({
      title: "Nova ljubav",
      type: "drama",
      authorComposer: "Madlenianum",
      subtitle: "Prica o novom pocetku",
      shortDescription: "Topla i duhovita predstava o hrabrosti da se ljubavi pruzi jos jedna sansa.",
      description: "Nova ljubav prati ljude koji izmedju secanja i novih odluka traze prostor za bliskost.",
      synopsis: "Susret koji dolazi u pravom trenutku menja zivote protagonista.",
      poster: media.homepage.novaLjubavPoster,
      gallery: [media.homepage.novaLjubavFeature].filter(Boolean),
      creativeTeam: [],
      cast: [],
      tags: ["drama", "mala scena"],
      isFeatured: true,
    });

    const announcementWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const announcementWindowEnd = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const announcementPeriod = (daysFromNow) => {
      const date = startOfToday();
      date.setDate(date.getDate() + daysFromNow);
      return { month: date.getMonth() + 1, year: date.getFullYear() };
    };

    carmen.recommendedProductions = [staklena._id, gordost._id];
    carmen.announcement = { isAnnounced: false };
    gospodin.announcement = {
      isAnnounced: true,
      ...announcementPeriod(45),
      text: "Velika ansambl predstava po motivima sveta Dostojevskog.",
      image: media.homepage.gospodinFeature?._id,
      startsAt: announcementWindowStart,
      endsAt: announcementWindowEnd,
    };
    pariski.announcement = {
      isAnnounced: true,
      ...announcementPeriod(75),
      text: "Opereta u velikom stilu stiže na Veliku scenu Madlenianuma.",
      image: media.homepage.pariskiFeature?._id,
      startsAt: announcementWindowStart,
      endsAt: announcementWindowEnd,
    };
    staklena.announcement = {
      isAnnounced: true,
      ...announcementPeriod(110),
      text: "Nova sezona donosi snažnu priču o krhkosti snova i porodičnim odnosima.",
      image: media.homepage.staklenaFeature?._id,
      startsAt: announcementWindowStart,
      endsAt: announcementWindowEnd,
    };
    await Promise.all([carmen.save(), gospodin.save(), pariski.save(), staklena.save()]);

    const schedule = {
      gospodin: futurePerformance({ daysFromNow: 4, hour: 17, minute: 0, durationMinutes: 150 }),
      gospodinSecond: futurePerformance({ daysFromNow: 6, hour: 21, minute: 0, durationMinutes: 150 }),
      gospodinThird: futurePerformance({ daysFromNow: 12, hour: 19, minute: 0, durationMinutes: 150 }),
      pariski: futurePerformance({ daysFromNow: 6, hour: 19, minute: 0, durationMinutes: 140 }),
      company: futurePerformance({ daysFromNow: 9, hour: 19, minute: 30, durationMinutes: 130 }),
      novaLjubav: futurePerformance({ daysFromNow: 17, hour: 20, minute: 0, durationMinutes: 100 }),
      staklena: futurePerformance({
        daysFromNow: 7,
        hour: 17,
        minute: 30,
        durationMinutes: 120,
      }),
      gordost: futurePerformance({
        daysFromNow: 10,
        hour: 17,
        minute: 30,
        durationMinutes: 120,
      }),
      carmen: futurePerformance({
        daysFromNow: 14,
        hour: 17,
        minute: 30,
        durationMinutes: 120,
      }),
      pluca: futurePerformance({
        daysFromNow: 21,
        hour: 18,
        minute: 0,
        durationMinutes: 90,
      }),
    };

    const events = {
      gospodin: await upsertEvent({
        production: gospodin,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: schedule.gospodin.startsAt,
        endsAt: schedule.gospodin.endsAt,
        badge: "Premijera",
        notes: "Seeded event for Gospodin u cizmama od dima.",
        isPremiere: true,
      }),
      pariski: await upsertEvent({
        production: pariski,
        venue,
        seatMap,
        pricePlan: balletRegularPlan,
        startsAt: schedule.pariski.startsAt,
        endsAt: schedule.pariski.endsAt,
        badge: eventBadge(schedule.pariski.startsAt),
        notes: "Seeded event for Pariski zivot.",
        saleStatus: "sold_out",
      }),
      company: await upsertEvent({
        production: company,
        venue,
        seatMap,
        pricePlan: balletRegularPlan,
        startsAt: schedule.company.startsAt,
        endsAt: schedule.company.endsAt,
        badge: eventBadge(schedule.company.startsAt),
        notes: "Seeded event for Company.",
      }),
      novaLjubav: await upsertEvent({
        production: novaLjubav,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: schedule.novaLjubav.startsAt,
        endsAt: schedule.novaLjubav.endsAt,
        badge: eventBadge(schedule.novaLjubav.startsAt),
        notes: "Seeded event for Nova ljubav.",
        saleStatus: "not_on_sale",
      }),
      staklena: await upsertEvent({
        production: staklena,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: schedule.staklena.startsAt,
        endsAt: schedule.staklena.endsAt,
        badge: eventBadge(schedule.staklena.startsAt),
        notes: "Seeded event for Staklena menažerija on Velika scena.",
      }),
      gordost: await upsertEvent({
        production: gordost,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: schedule.gordost.startsAt,
        endsAt: schedule.gordost.endsAt,
        badge: "Klasik u novom ruhu",
        notes: "Seeded event for Gordost i predrasude.",
      }),
      carmen: await upsertEvent({
        production: carmen,
        venue,
        seatMap,
        pricePlan: balletRegularPlan,
        startsAt: schedule.carmen.startsAt,
        endsAt: schedule.carmen.endsAt,
        badge: eventBadge(schedule.carmen.startsAt),
        notes: "Seeded event for Carmen Suite & Bolero.",
      }),
      pluca: await upsertEvent({
        production: pluca,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: schedule.pluca.startsAt,
        endsAt: schedule.pluca.endsAt,
        badge: eventBadge(schedule.pluca.startsAt),
        notes: "Seeded event for Pluća on Velika scena.",
      }),
    };

    await Promise.all([
      upsertEvent({
        production: gospodin,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: schedule.gospodinSecond.startsAt,
        endsAt: schedule.gospodinSecond.endsAt,
        badge: eventBadge(schedule.gospodinSecond.startsAt),
        notes: "Seeded event for Gospodin u cizmama od dima - second performance.",
      }),
      upsertEvent({
        production: gospodin,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: schedule.gospodinThird.startsAt,
        endsAt: schedule.gospodinThird.endsAt,
        badge: eventBadge(schedule.gospodinThird.startsAt),
        notes: "Seeded event for Gospodin u cizmama od dima - third performance.",
      }),
    ]);

    const archiveSchedule = {
      pariski: futurePerformance({ daysFromNow: -140, hour: 19, minute: 0, durationMinutes: 140 }),
      gospodin: futurePerformance({ daysFromNow: -112, hour: 20, minute: 0, durationMinutes: 150 }),
      novaLjubav: futurePerformance({ daysFromNow: -84, hour: 19, minute: 30, durationMinutes: 100 }),
      company: futurePerformance({ daysFromNow: -56, hour: 19, minute: 30, durationMinutes: 130 }),
      staklena: futurePerformance({ daysFromNow: -28, hour: 20, minute: 0, durationMinutes: 120 }),
    };

    await Promise.all([
      upsertEvent({
        production: pariski,
        venue,
        seatMap,
        pricePlan: balletRegularPlan,
        ...archiveSchedule.pariski,
        notes: "[seed:phase3content:archive] Pariski zivot.",
        saleStatus: "sales_closed",
        status: "finished",
        ticketingEnabled: false,
      }),
      upsertEvent({
        production: gospodin,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        ...archiveSchedule.gospodin,
        notes: "[seed:phase3content:archive] Gospodin u cizmama od dima.",
        saleStatus: "sales_closed",
        status: "finished",
        ticketingEnabled: false,
      }),
      upsertEvent({
        production: novaLjubav,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        ...archiveSchedule.novaLjubav,
        notes: "[seed:phase3content:archive] Nova ljubav.",
        saleStatus: "sales_closed",
        status: "finished",
        ticketingEnabled: false,
      }),
      upsertEvent({
        production: company,
        venue,
        seatMap,
        pricePlan: balletRegularPlan,
        ...archiveSchedule.company,
        notes: "[seed:phase3content:archive] Company.",
        saleStatus: "sales_closed",
        status: "finished",
        ticketingEnabled: false,
      }),
      upsertEvent({
        production: staklena,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        ...archiveSchedule.staklena,
        notes: "[seed:phase3content:archive] Staklena menazerija.",
        saleStatus: "sales_closed",
        status: "finished",
        ticketingEnabled: false,
      }),
    ]);

    await PromoSlide.deleteMany({
      $or: [{ slug: null }, { slug: "" }, { slug: "x-y-0" }],
    });

    const gospodinSlide = await upsertPromoSlide({
      title: "Gospodin u čizmama od dima",
      subtitle: "Velika dramska predstava po motivima Dostojevskog",
      image: media.homepage.gospodinFeature,
      production: gospodin,
      event: events.gospodin,
    });

    const expiredSlide = await upsertPromoSlide({
      title: "ARHIVSKI HERO TEST",
      subtitle: "Ovaj slajd ne sme biti javno vidljiv",
      image: media.homepage.gospodinFeature,
      production: gospodin,
      event: events.gospodin,
      activeFrom: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      activeUntil: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const pariskiSlide = await upsertPromoSlide({
      title: "Pariski život",
      subtitle: "Opereta u velikom stilu",
      image: media.homepage.pariskiFeature,
      production: pariski,
      event: events.pariski,
    });

    const novaLjubavSlide = await upsertPromoSlide({
      title: "Nova ljubav",
      subtitle: "Priča o novom početku",
      image: media.homepage.novaLjubavFeature,
      production: novaLjubav,
      event: events.novaLjubav,
    });

    const carmenSlide = await upsertPromoSlide({
      title: "CARMEN SUITE & BOLERO",
      subtitle: "Doživite balet kao nikad pre",
      image: media.main.carmen,
      production: carmen,
      event: events.carmen,
    });

    const gordostSlide = await upsertPromoSlide({
      title: "GORDOST I PREDRASUDE",
      subtitle: "Klasik u novom ruhu",
      image: media.main.gordost,
      production: gordost,
      event: events.gordost,
    });

    const plucaSlide = await upsertPromoSlide({
      title: "PLUĆA",
      subtitle: "Drama o svima nama",
      image: media.main.pluca,
      production: pluca,
      event: events.pluca,
    });

    const staklenaSlide = await upsertPromoSlide({
      title: "STAKLENA MENAŽERIJA",
      subtitle: "Drama o krhkosti snova",
      image: media.homepage.staklenaFeature || media.main.staklena,
      production: staklena,
      event: events.staklena,
    });

    const staticPages = {
      about: await upsertStaticPage({
        title: "O nama",
        slug: "o-nama",
        pageType: "about",
        image: media.homepage.building || media.main.staklena,
        body:
          "Madlenianum je scena posvecena operi, baletu, drami, mjuziklu i koncertnom programu. Ova demo stranica se kreira kroz seed kako bi javni sajt uvek imao osnovni institucionalni sadrzaj za lokalno testiranje.",
        sections: [
          {
            sectionType: "hero",
            enabled: true,
            heading: "Madlenianum",
            subtitle: "Opera i teatar u Zemunu",
            body: "<p>Scena posvecena operi, baletu, drami, mjuziklu i koncertnom programu.</p>",
            backgroundImage: media.homepage.building?._id,
            displayOrder: 0,
          },
          {
            sectionType: "text-image",
            enabled: true,
            heading: "Kuca umetnosti",
            body: "<p>Madlenianum okuplja umetnike i publiku kroz repertoar koji povezuje tradiciju i savremeni izraz.</p>",
            image: media.homepage.building?._id,
            imagePosition: "right",
            displayOrder: 1,
          },
          {
            sectionType: "timeline",
            enabled: true,
            heading: "Nas put",
            timelineItems: [
              { period: "1999", title: "Osnivanje", description: "Pocetak rada opere i teatra Madlenianum.", displayOrder: 0 },
              { period: "Danas", title: "Aktuelni repertoar", description: "Opera, balet, drama i koncertni program.", displayOrder: 1 },
            ],
            displayOrder: 2,
          },
          {
            sectionType: "gallery",
            enabled: true,
            heading: "Galerija",
            galleryItems: galleryItems(media.gallery.staklena),
            displayOrder: 3,
          },
        ],
      }),
      contact: await upsertStaticPage({
        title: "Kontakt",
        slug: "kontakt",
        pageType: "contact",
        image: media.main.gordost,
        body:
          "Madlenianum, Glavna 32, Zemun. Za informacije o programu, ulaznicama i saradnji koristite kontakt podatke koji ce biti uredjeni kroz admin panel.",
        contact: {
          introduction: "<p>Za informacije o programu, ulaznicama i saradnji obratite se timu Madlenianuma.</p>",
          mapUrl: "https://maps.google.com/?q=Madlenianum+Zemun",
          officeHours: "Radnim danima 09:00-17:00",
          ticketOfficeHours: "Radnim danima i na dane izvodjenja",
          additionalItems: [
            { label: "Adresa", value: "Glavna 32, Zemun", type: "text", displayOrder: 0 },
          ],
          contactFormEnabled: true,
          recipientEmails: ["office@madlenianum.rs"],
        },
      }),
    };

    const seededNews = await upsertNews({
      title: "Nova sezona Madlenianuma",
      subtitle: "Repertoar koji povezuje umetnike i publiku",
      excerpt: "Predstavljamo izbor dramskih i baletskih naslova aktuelne sezone.",
      body: "<p>Madlenianum u novoj sezoni donosi pazljivo odabran program drame i baleta.</p><h2>Program</h2><p>Termini i ulaznice dostupni su kroz javni repertoar.</p>",
      image: media.main.carmen,
      gallery: media.gallery.carmen,
      relatedProduction: carmen,
      category: "najava",
    });

    const pressNews = await upsertNews({
      title: "Gospodin u cizmama od dima pred publikom",
      subtitle: "Nova velika dramska produkcija",
      excerpt: "Ansambl Madlenianuma donosi scenski svet Dostojevskog pred publiku Velike scene.",
      body: "<p>Nova dramska predstava okuplja veliki ansambl i donosi spoj humora, apsurda i snazne glumacke igre.</p>",
      image: media.homepage.gospodinFeature,
      gallery: [media.homepage.gospodinFeature].filter(Boolean),
      relatedProduction: gospodin,
      category: "press",
    });

    const announcementNews = await upsertNews({
      title: "Pariski zivot uskoro na Velikoj sceni",
      subtitle: "Opereta koja donosi duh grada svetlosti",
      excerpt: "Muzika, pokret i raskosna scena susrecu se u novom terminu Pariskog zivota.",
      body: "<p>Ulaznice za Pariski zivot dostupne su kroz javni repertoar Madlenianuma.</p>",
      image: media.homepage.pariskiFeature,
      gallery: [media.homepage.pariskiFeature].filter(Boolean),
      relatedProduction: pariski,
      category: "najava",
    });

    const noticeNews = await upsertNews({
      title: "Informacije o radu biletarnice",
      subtitle: "Planirajte posetu Madlenianumu",
      excerpt: "Biletarnica je otvorena radnim danima i na dane izvodjenja prema objavljenom programu.",
      body: "<p>Za sva pitanja o ulaznicama obratite se biletarnici putem kontakt podataka na sajtu.</p>",
      image: media.homepage.building,
      gallery: [],
      relatedProduction: null,
      category: "obavestenje",
    });

    const seededSlides = [expiredSlide, gospodinSlide, pariskiSlide, novaLjubavSlide, staklenaSlide, carmenSlide, gordostSlide, plucaSlide].filter(Boolean);

    const homepageConfig = await upsertHomepageConfig({
      slides: seededSlides,
      events: Object.values(events),
      productions: [gospodin, pariski, company, novaLjubav, staklena, gordost, carmen, pluca],
      featuredProductions: [gospodin, pariski, carmen, novaLjubav],
      news: [pressNews, announcementNews, noticeNews, seededNews],
      teaserImage: media.homepage.building,
      aboutPage: staticPages.about,
      ctaCards: [
        { title: "Gostovanja", text: "Programi i saradnje koje Madlenianum ostvaruje sa umetnicima i institucijama.", image: media.homepage.guestPerformances?._id, linkLabel: "Kontaktirajte nas", url: "/strana/kontakt", enabled: true, displayOrder: 0 },
        { title: "Zakup prostora", text: "Saznajte više o mogućnostima organizovanja događaja u prostorima Madlenianuma.", image: media.homepage.venueRental?._id, linkLabel: "Kontaktirajte nas", url: "/strana/kontakt", enabled: true, displayOrder: 1 },
        { title: "Najam kostima i rekvizita", text: "Pošaljite upit timu Madlenianuma za dostupne kostime i scenske rekvizite.", image: media.homepage.costumeRental?._id, linkLabel: "Kontaktirajte nas", url: "/strana/kontakt", enabled: true, displayOrder: 2 },
      ],
    });

    const siteSettings = await upsertSiteSettings({ socialImage: media.main.carmen });

    const customers = {
      milica: await upsertCustomer({
        fullName: "Milica Petrović",
        email: "milica.petrovic@example.com",
        phone: "+381601112223",
        city: "Beograd",
      }),
      marko: await upsertCustomer({
        fullName: "Marko Jovanović",
        email: "marko.jovanovic@example.com",
        phone: "+381602223334",
        city: "Beograd",
      }),
      ana: await upsertCustomer({
        fullName: "Ana Nikolić",
        email: "ana.nikolic@example.com",
        phone: "+381603334445",
        city: "Novi Sad",
      }),
    };

    const seededOrders = [
      await createSeedOrder({
        orderCode: "MDL-SEED-STAKLENA-PAID",
        customer: customers.milica,
        event: events.staklena,
        seatMap,
        seatLabels: ["I-1", "I-2", "I-3", "I-4"],
        status: "paid",
      }),
      await createSeedOrder({
        orderCode: "MDL-SEED-GORDOST-RESERVED",
        customer: customers.marko,
        event: events.gordost,
        seatMap,
        seatLabels: ["II-5", "II-6"],
        status: "reserved",
      }),
      await createSeedOrder({
        orderCode: "MDL-SEED-PLUCA-PAID",
        customer: customers.ana,
        event: events.pluca,
        seatMap,
        seatLabels: ["III-7", "III-8"],
        status: "paid",
      }),
    ];

    const seededLocks = await createSeedLock({
      event: events.carmen,
      seatMap,
      seatLabels: ["IV-10", "IV-11"],
      sessionId: "seed-lock-carmen",
    });

    console.log("Phase 3 content seed completed.");
    console.log("");
    console.log("Productions:");
    console.log({
      staklena: staklena._id.toString(),
      gordost: gordost._id.toString(),
      carmen: carmen._id.toString(),
      pluca: pluca._id.toString(),
      xy: xy._id.toString(),
    });

    console.log("");
    console.log("Events:");
    console.log({
      staklena: {
        id: events.staklena._id.toString(),
        startsAt: events.staklena.startsAt,
        saleEndsAt: events.staklena.saleEndsAt,
      },
      gordost: {
        id: events.gordost._id.toString(),
        startsAt: events.gordost.startsAt,
        saleEndsAt: events.gordost.saleEndsAt,
      },
      carmen: {
        id: events.carmen._id.toString(),
        startsAt: events.carmen.startsAt,
        saleEndsAt: events.carmen.saleEndsAt,
      },
      pluca: {
        id: events.pluca._id.toString(),
        startsAt: events.pluca.startsAt,
        saleEndsAt: events.pluca.saleEndsAt,
      },
    });

    console.log("");
    console.log("Static pages:");
    console.log({
      about: {
        id: staticPages.about._id.toString(),
        slug: staticPages.about.slug,
      },
      contact: {
        id: staticPages.contact._id.toString(),
        slug: staticPages.contact.slug,
      },
    });

    console.log("");
    console.log("Seeded orders:");
    console.log(seededOrders.map((order) => ({
      orderCode: order.orderCode,
      status: order.status,
      totalAmount: order.totalAmount,
    })));

    console.log("");
    console.log("Seeded locks:");
    console.log({
      count: seededLocks.length,
      sessionId: "seed-lock-carmen",
    });

    console.log("");
    console.log("Useful verification endpoints:");
    console.log(`GET http://localhost:${process.env.PORT || 5000}/api/public/home`);
    console.log(`GET http://localhost:${process.env.PORT || 5000}/api/public/repertoire`);
    console.log(`GET http://localhost:${process.env.PORT || 5000}/api/public/productions`);
    console.log(`GET http://localhost:${process.env.PORT || 5000}/api/public/pages/o-nama`);
    console.log(`GET http://localhost:${process.env.PORT || 5000}/api/public/pages/kontakt`);
    console.log(
      `GET http://localhost:${process.env.PORT || 5000}/api/public/events/${events.carmen._id.toString()}/seats`
    );
    console.log(
      `GET http://localhost:${process.env.PORT || 5000}/api/public/events/${events.gordost._id.toString()}/seats`
    );

    process.exit(0);
  } catch (error) {
    console.error("Phase 3 content seed failed:");
    console.error(error);
    process.exit(1);
  }
};

seedPhase3Content();
