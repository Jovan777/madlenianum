const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const connectDB = require("../config/db");
const slugify = require("../utils/slugify");

const Media = require("../models/Media");
const Artist = require("../models/Artist");
const Production = require("../models/Production");
const PromoSlide = require("../models/PromoSlide");
const Event = require("../models/Event");
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

const upsertMedia = async ({ relativePath, title, altText }) => {
  const meta = getFileMeta(relativePath);

  if (!meta) {
    return null;
  }

  return Media.findOneAndUpdate(
    { url: meta.url },
    {
      title,
      altText,
      originalName: meta.originalName,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      size: meta.size,
      path: meta.storagePath,
      url: meta.url,
      type: "image",
      status: "active",
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );
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

const upsertArtist = async ({ displayName, professions, biography, image }) => {
  const slug = slugify(displayName);

  return Artist.findOneAndUpdate(
    { slug },
    {
      displayName,
      slug,
      professions,
      biography,
      image: image?._id,
      gallery: [],
      links: [],
      translations: {},
      status: "published",
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
    durationMinutes: 90,
    performanceLanguage: "sr",
    subtitles: "",
    poster: poster?._id,
    gallery: gallery.map((item) => item._id),
    videoUrls: [],
    creativeTeam,
    cast,
    season: "2025/2026",
    tags,
    translations: {},
    seo: {
      title: `${title} | Madlenianum`,
      description: shortDescription,
      keywords: ["Madlenianum", title, type],
    },
    status: "published",
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
}) => {
  return Event.findOneAndUpdate(
    {
      production: production._id,
      startsAt,
    },
    {
      production: production._id,
      venue: venue._id,
      startsAt,
      endsAt,
      isPremiere: false,
      badge: badge || "",
      status: "scheduled",
      saleStatus: "on_sale",
      seatMap: seatMap._id,
      pricePlan: pricePlan._id,
      saleStartsAt: new Date("2026-06-01T08:00:00.000Z"),
      saleEndsAt: new Date(startsAt.getTime() - 30 * 60 * 1000),
      maxTicketsPerOrder: 4,
      lockDurationMinutes: 15,
      ticketing: {
        enabled: true,
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
  )
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
}) => {
  const slug = slugify(title);

  return PromoSlide.findOneAndUpdate(
    { slug },
    {
      title,
      slug,
      description: subtitle || "",
      image: image?._id,
      linkLabel: "Pogledajte vise",
      linkUrl: production ? `/predstave/${production.slug}` : "",
      relatedProduction: production?._id,
      language: "sr",
      status: "published",
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
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
    };

    const artists = {
      tamara: await upsertArtist({
        displayName: "Tamara Aleksić",
        professions: ["glumica"],
        biography:
          "Tamara Aleksić je umetnica povezana sa repertoarom Madlenianuma i dramskim naslovima aktuelne sezone.",
        image: media.artists.tamara,
      }),
      nikola: await upsertArtist({
        displayName: "Nikola Rakočević",
        professions: ["glumac"],
        biography:
          "Nikola Rakočević je umetnik povezan sa repertoarom Madlenianuma i savremenim pozorišnim izrazom.",
        image: media.artists.nikola,
      }),
      ivan: await upsertArtist({
        displayName: "Ivan Vuković",
        professions: ["reditelj"],
        biography:
          "Ivan Vuković je reditelj povezan sa predstavama na repertoaru Madlenianuma i radom ansambla.",
        image: media.artists.ivan,
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

    const events = {
      staklena: await upsertEvent({
        production: staklena,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: new Date("2026-06-19T17:30:00.000Z"),
        endsAt: new Date("2026-06-19T19:30:00.000Z"),
        badge: "19. jun",
        notes: "Seeded event for Staklena menažerija on Velika scena.",
      }),
      gordost: await upsertEvent({
        production: gordost,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: new Date("2026-06-10T17:30:00.000Z"),
        endsAt: new Date("2026-06-10T19:30:00.000Z"),
        badge: "Klasik u novom ruhu",
        notes: "Seeded event for Gordost i predrasude.",
      }),
      carmen: await upsertEvent({
        production: carmen,
        venue,
        seatMap,
        pricePlan: balletRegularPlan,
        startsAt: new Date("2026-06-24T17:30:00.000Z"),
        endsAt: new Date("2026-06-24T19:30:00.000Z"),
        badge: "24. jun",
        notes: "Seeded event for Carmen Suite & Bolero.",
      }),
      pluca: await upsertEvent({
        production: pluca,
        venue,
        seatMap,
        pricePlan: dramaRegularPlan,
        startsAt: new Date("2026-06-23T18:00:00.000Z"),
        endsAt: new Date("2026-06-23T19:30:00.000Z"),
        badge: "23. jun",
        notes: "Seeded event for Pluća on Velika scena.",
      }),
    };

    await PromoSlide.deleteMany({
      $or: [{ slug: null }, { slug: "" }, { slug: "x-y-0" }],
    });

    await upsertPromoSlide({
      title: "CARMEN SUITE & BOLERO",
      subtitle: "Doživite balet kao nikad pre",
      image: media.main.carmen,
      production: carmen,
      event: events.carmen,
    });

    await upsertPromoSlide({
      title: "GORDOST I PREDRASUDE",
      subtitle: "Klasik u novom ruhu",
      image: media.main.gordost,
      production: gordost,
      event: events.gordost,
    });

    await upsertPromoSlide({
      title: "PLUĆA",
      subtitle: "Drama o svima nama",
      image: media.main.pluca,
      production: pluca,
      event: events.pluca,
    });

    await upsertPromoSlide({
      title: "STAKLENA MENAŽERIJA",
      subtitle: "Drama o krhkosti snova",
      image: media.main.staklena,
      production: staklena,
      event: events.staklena,
    });

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
      staklena: events.staklena._id.toString(),
      gordost: events.gordost._id.toString(),
      carmen: events.carmen._id.toString(),
      pluca: events.pluca._id.toString(),
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
    console.log(`GET http://localhost:${process.env.PORT || 5000}/api/public/productions`);
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
