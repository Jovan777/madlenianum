const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const connectDB = require("../config/db");
const slugify = require("../utils/slugify");

const Media = require("../models/Media");
const Production = require("../models/Production");
const Venue = require("../models/Venue");
const SiteSettings = require("../models/SiteSettings");
const CostumeItem = require("../models/CostumeItem");
const PropScenographyItem = require("../models/PropScenographyItem");
const RentalSpace = require("../models/RentalSpace");
const RentalInquiry = require("../models/RentalInquiry");
const EventPlanningInquiry = require("../models/EventPlanningInquiry");
const seedEnglishContent = require("./seedEnglishContent");

const UPLOAD_ROOT = path.join(__dirname, "../../uploads/madlenianum");

const encodePublicUrl = (relativePath) => relativePath
  .split(/[\\/]/)
  .map((part) => encodeURIComponent(part))
  .join("/");

const mimeFor = (relativePath) => {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
};

const mediaTypeFor = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "document";
  return "other";
};

const fileMeta = (relativePath) => {
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    console.warn(`Missing Phase 6A media file: ${absolutePath}`);
    return null;
  }
  const stats = fs.statSync(absolutePath);
  const mimeType = mimeFor(relativePath);
  return {
    originalName: path.basename(relativePath),
    filename: path.basename(relativePath),
    mimeType,
    size: stats.size,
    storagePath: path.join("madlenianum", relativePath).replace(/\\/g, "/"),
    url: `/uploads/madlenianum/${encodePublicUrl(relativePath)}`,
    fileType: mediaTypeFor(mimeType),
  };
};

const upsertMedia = async ({ relativePath, title, altText }) => {
  const meta = fileMeta(relativePath);
  if (!meta) return null;
  return Media.findOneAndUpdate(
    { url: meta.url },
    {
      ...meta,
      title,
      alt: altText || title,
      caption: "",
      credit: "Madlenianum",
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
};

const galleryItems = (items) => (items || [])
  .filter(Boolean)
  .map((media, index) => ({
    media: media._id,
    caption: "",
    credit: "Madlenianum",
    altText: media.alt || media.title || "",
    translations: {
      en: {
        caption: "",
        credit: "Madlenianum",
        altText: seedEnglishContent.translateSeedMetadata(
          media.alt || media.title || "",
          { preserveUnknown: true }
        ),
      },
    },
    displayOrder: index,
  }));

const meaningfulTranslationValues = (value = {}) => Object.fromEntries(
  Object.entries(value || {}).filter(([, entry]) => (
    Array.isArray(entry) ? entry.length > 0 : entry !== undefined && entry !== null && entry !== ""
  ))
);

const seedTranslations = (existing, sr, en) => ({
  sr: {
    ...meaningfulTranslationValues(sr),
    ...meaningfulTranslationValues(existing?.sr),
  },
  en: {
    ...meaningfulTranslationValues(en),
    ...meaningfulTranslationValues(existing?.en),
  },
});

const upsertCostume = async (payload) => {
  const inventoryNumber = payload.inventoryNumber.toUpperCase();
  const slug = slugify(payload.slug || payload.title);
  const existing = await CostumeItem.findOne({ inventoryNumber }).select("translations").lean();
  return CostumeItem.findOneAndUpdate(
    { inventoryNumber },
    {
      ...payload,
      slug,
      mainImage: payload.mainImage?._id,
      gallery: (payload.gallery || []).filter(Boolean).map((item) => item._id),
      galleryItems: galleryItems(payload.gallery),
      relatedProduction: payload.relatedProduction?._id,
      translations: seedTranslations(
        existing?.translations,
        {
          slug,
          title: payload.title,
          shortDescription: payload.shortDescription,
          description: payload.description,
          epoch: payload.epoch,
          size: payload.size,
          color: payload.color,
          material: payload.material,
          availabilityNote: payload.availabilityNote,
        },
        seedEnglishContent.costumes[inventoryNumber]
      ),
      status: "published",
      publishedAt: payload.publishedAt || new Date(),
      seo: {
        title: `${payload.title} | Fundus Madlenianum`,
        description: payload.shortDescription || payload.availabilityNote || "",
        keywords: ["Madlenianum", "fundus", "kostimi", payload.epoch].filter(Boolean),
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
};

const upsertPropScenography = async (payload) => {
  const inventoryNumber = payload.inventoryNumber.toUpperCase();
  const slug = slugify(payload.slug || payload.title);
  const existing = await PropScenographyItem.findOne({ inventoryNumber }).select("translations").lean();
  return PropScenographyItem.findOneAndUpdate(
    { inventoryNumber },
    {
      ...payload,
      slug,
      mainImage: payload.mainImage?._id,
      gallery: (payload.gallery || []).filter(Boolean).map((item) => item._id),
      galleryItems: galleryItems(payload.gallery),
      relatedProduction: payload.relatedProduction?._id,
      translations: seedTranslations(
        existing?.translations,
        {
          slug,
          title: payload.title,
          description: payload.description,
          category: payload.category,
          epochOrStyle: payload.epochOrStyle,
          dimensionsNote: payload.dimensions?.note,
          material: payload.material,
          availabilityNote: payload.availabilityNote,
        },
        seedEnglishContent.props[inventoryNumber]
      ),
      status: "published",
      publishedAt: payload.publishedAt || new Date(),
      seo: {
        title: `${payload.title} | Fundus Madlenianum`,
        description: payload.description?.replace(/<[^>]+>/g, "").slice(0, 155) || "",
        keywords: ["Madlenianum", "fundus", payload.itemType, payload.category].filter(Boolean),
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
};

const upsertRentalSpace = async (payload) => {
  const slug = slugify(payload.slug || payload.title);
  const existing = await RentalSpace.findOne({ slug }).select("translations").lean();
  return RentalSpace.findOneAndUpdate(
    { slug },
    {
      ...payload,
      slug,
      heroImage: payload.heroImage?._id,
      gallery: (payload.gallery || []).filter(Boolean).map((item) => item._id),
      galleryItems: galleryItems(payload.gallery),
      floorPlanPdf: payload.floorPlanPdf?._id,
      linkedVenue: payload.linkedVenue?._id,
      translations: seedTranslations(
        existing?.translations,
        {
          slug,
          title: payload.title,
          shortDescription: payload.shortDescription,
          description: payload.description,
          amenities: payload.amenities,
          technicalEquipment: payload.technicalEquipment,
          suitableEventTypes: payload.suitableEventTypes,
          accessibilityInfo: payload.accessibilityInfo,
          dressingRooms: payload.dressingRooms,
          cateringInfo: payload.cateringInfo,
          barInfo: payload.barInfo,
          internetInfo: payload.internetInfo,
          avInfo: payload.avInfo,
        },
        seedEnglishContent.rentalSpaces[slug]
      ),
      status: "published",
      publishedAt: payload.publishedAt || new Date(),
      seo: {
        title: `${payload.title} | Zakup prostora Madlenianum`,
        description: payload.shortDescription || "",
        keywords: ["Madlenianum", "zakup prostora", payload.title],
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
};

const runPhase6ASeed = async () => {
  const media = {
    clothes: {
      lawyerCape: await upsertMedia({ relativePath: "fundus/clothes/advokatska_pelerina.png", title: "Advokatska pelerina", altText: "Advokatska pelerina iz fundusa" }),
      austroCoat: await upsertMedia({ relativePath: "fundus/clothes/Austrougarski_sinjel.png", title: "Austrougarski sinjel", altText: "Austrougarski sinjel" }),
      hospitalSkirt: await upsertMedia({ relativePath: "fundus/clothes/bolnicka_suknja.png", title: "Bolnicka suknja", altText: "Bolnicka suknja" }),
      civicCapes: await upsertMedia({ relativePath: "fundus/clothes/gradjanske_pelerine.png", title: "Gradjanske pelerine", altText: "Gradjanske pelerine" }),
      generalUniform: await upsertMedia({ relativePath: "fundus/clothes/svecana_generalova_uniforma.png", title: "Svecana generalova uniforma", altText: "Svecana generalova uniforma" }),
      armyUniform: await upsertMedia({ relativePath: "fundus/clothes/svecana_vojna_uniforma.png", title: "Svecana vojna uniforma", altText: "Svecana vojna uniforma" }),
    },
    props: {
      props1: await upsertMedia({ relativePath: "fundus/props_and_scenography/props_1.jpg", title: "Fundus rekvizit 1", altText: "Rekvizit iz fundusa" }),
      props2: await upsertMedia({ relativePath: "fundus/props_and_scenography/props_2.png", title: "Fundus rekvizit 2", altText: "Scenski rekvizit" }),
      props3: await upsertMedia({ relativePath: "fundus/props_and_scenography/props_3.jpg", title: "Fundus scenografija 1", altText: "Scenografski element" }),
      props4: await upsertMedia({ relativePath: "fundus/props_and_scenography/props_4.jpg", title: "Fundus scenografija 2", altText: "Scenografski element iz fundusa" }),
    },
    rental: {
      building: await upsertMedia({ relativePath: "madlenianum_zgrada.jpg", title: "Zgrada Madlenianum", altText: "Zgrada Madlenianuma" }),
      rental: await upsertMedia({ relativePath: "zakup_prostora_slika.jpg", title: "Zakup prostora", altText: "Prostor za zakup" }),
      guest: await upsertMedia({ relativePath: "gostovanja_slika.jpg", title: "Gostovanja", altText: "Sala Madlenianuma" }),
    },
  };

  const relatedProduction = await Production.findOne({ status: "published" }).sort("title");
  const venue = await Venue.findOne({ slug: "velika-scena" }) || await Venue.findOne().sort("name");

  const costumes = await Promise.all([
    upsertCostume({
      title: "Advokatska pelerina",
      shortDescription: "Scenska pelerina za sudske i gradjanske likove.",
      description: "<p>Elegantna pelerina pogodna za dramske produkcije, formalne scene i istorijske likove.</p>",
      mainImage: media.clothes.lawyerCape,
      gallery: [media.clothes.lawyerCape],
      gender: "unisex",
      epoch: "19. vek",
      color: "crna",
      material: "stof",
      inventoryNumber: "KOS-ADV-001",
      condition: "good",
      availabilityNote: "Dostupnost se proverava direktno sa fundusom.",
      relatedProduction,
      isFeatured: true,
      displayOrder: 1,
    }),
    upsertCostume({
      title: "Austrougarski sinjel",
      shortDescription: "Vojni kaput istorijskog karaktera.",
      description: "<p>Sinjel inspirisan austrougarskom uniformom za istorijske i salonske scene.</p>",
      mainImage: media.clothes.austroCoat,
      gallery: [media.clothes.austroCoat, media.clothes.armyUniform],
      gender: "male",
      epoch: "Austrougarska",
      size: "L",
      color: "siva",
      material: "vuna",
      inventoryNumber: "KOS-AUS-002",
      condition: "good",
      relatedProduction,
      displayOrder: 2,
    }),
    upsertCostume({
      title: "Svecana generalova uniforma",
      shortDescription: "Svecana uniforma za oficirske i protokolarne likove.",
      description: "<p>Uniforma sa dekorativnim detaljima, pogodna za operu i dramske scene.</p>",
      mainImage: media.clothes.generalUniform,
      gallery: [media.clothes.generalUniform, media.clothes.armyUniform],
      gender: "male",
      epoch: "20. vek",
      size: "XL",
      color: "tamna",
      material: "stof",
      inventoryNumber: "KOS-GEN-003",
      condition: "excellent",
      isFeatured: true,
      displayOrder: 3,
    }),
    upsertCostume({
      title: "Gradjanske pelerine",
      shortDescription: "Set pelerina za ansambl i salonske scene.",
      description: "<p>Grupni komad fundusa za urbane, istorijske i ceremonijalne scene.</p>",
      mainImage: media.clothes.civicCapes,
      gallery: [media.clothes.civicCapes],
      gender: "unisex",
      epoch: "klasicni stil",
      color: "tamna",
      inventoryNumber: "KOS-PEL-004",
      condition: "good",
      displayOrder: 4,
    }),
    upsertCostume({
      title: "Bolnicka suknja",
      shortDescription: "Kostimski element za institucionalne i savremene scene.",
      description: "<p>Kostimski deo namenjen scenskim situacijama savremenog i realistickog karaktera.</p>",
      mainImage: media.clothes.hospitalSkirt,
      gallery: [media.clothes.hospitalSkirt],
      gender: "female",
      epoch: "savremeno",
      color: "bela",
      inventoryNumber: "KOS-BOL-005",
      condition: "fair",
      displayOrder: 5,
    }),
  ]);

  const propItems = await Promise.all([
    upsertPropScenography({
      title: "Scenski rekvizit - salonski detalj",
      itemType: "prop",
      description: "<p>Dekorativni rekvizit za salonske i dramske scene.</p>",
      mainImage: media.props.props1,
      gallery: [media.props.props1],
      category: "salonski rekvizit",
      epochOrStyle: "klasicni stil",
      dimensions: { widthCm: 40, heightCm: 55, depthCm: 30, note: "Orijentacione mere." },
      material: "drvo i tekstil",
      weight: 3,
      inventoryNumber: "PRP-SAL-001",
      condition: "good",
      isFeatured: true,
      displayOrder: 1,
      relatedProduction,
    }),
    upsertPropScenography({
      title: "Rucni scenski rekvizit",
      itemType: "prop",
      description: "<p>Manji rekvizit za karakterne uloge i ansambl scene.</p>",
      mainImage: media.props.props2,
      gallery: [media.props.props2],
      category: "rucni rekvizit",
      epochOrStyle: "razno",
      material: "kombinovani materijali",
      weight: 1,
      inventoryNumber: "PRP-RUC-002",
      condition: "good",
      displayOrder: 2,
    }),
    upsertPropScenography({
      title: "Scenografski element - enterijer",
      itemType: "scenography",
      description: "<p>Element scenografije namenjen ambijentalnom oblikovanju prostora.</p>",
      mainImage: media.props.props3,
      gallery: [media.props.props3],
      category: "enterijer",
      epochOrStyle: "savremeno",
      dimensions: { widthCm: 160, heightCm: 220, depthCm: 40 },
      material: "drvo",
      weight: 24,
      inventoryNumber: "SCN-ENT-003",
      condition: "good",
      isFeatured: true,
      displayOrder: 3,
    }),
    upsertPropScenography({
      title: "Scenografski element - fasada",
      itemType: "scenography",
      description: "<p>Veci scenografski segment za pozadinske i ambijentalne postavke.</p>",
      mainImage: media.props.props4,
      gallery: [media.props.props4],
      category: "arhitektura",
      epochOrStyle: "istorijski stil",
      dimensions: { widthCm: 250, heightCm: 280, depthCm: 60 },
      material: "kombinovani materijali",
      weight: 40,
      inventoryNumber: "SCN-FAS-004",
      condition: "fair",
      displayOrder: 4,
    }),
  ]);

  const rentalSpaces = await Promise.all([
    upsertRentalSpace({
      title: "Velika sala",
      slug: "velika-scena-zakup",
      shortDescription: "Najakusticnija sala u Beogradu, projektovana prema najvisim standardima savremenog teatra.",
      description: "<p>Savrsen izbor za velike kongrese, svecane akademije, koncerte i reprezentativne korporativne dogadjaje.</p>",
      heroImage: media.rental.guest || media.rental.building,
      gallery: [media.rental.guest, media.rental.building].filter(Boolean),
      seatedCapacity: 504,
      standingCapacity: 504,
      areaSqm: 0,
      amenities: ["Vrhunska akustika", "Simultani prevod"],
      technicalEquipment: ["TV/Internet prikljucci", "Scenska rasveta", "Ozvucenje"],
      suitableEventTypes: ["konferencija", "promocija", "koncert", "svecanost"],
      accessibilityInfo: "Pristup je moguc za osobe sa smanjenom pokretljivoscu.",
      dressingRooms: "Dostupne su garderobe za izvodjace.",
      cateringInfo: "Catering se dogovara po upitu.",
      barInfo: "Bar usluga je dostupna po dogovoru.",
      internetInfo: "Internet dostupnost se potvrdjuje pri upitu.",
      avInfo: "Osnovna AV podrska dostupna je uz tehnicku najavu.",
      linkedVenue: venue,
      isFeatured: true,
      displayOrder: 1,
    }),
    upsertRentalSpace({
      title: "Bel Etage",
      slug: "bel-etage",
      shortDescription: "Atraktivan i visenamenski prostor pogodan za dinamicne dogadjaje, od strucnih seminara do ekskluzivnih modnih revija i koktel zabava.",
      description: "<p>Bel Etage je prilagodljiv prostor za poslovne susrete, modne revije, koktele, seminare i druge dogadjaje koji zahtevaju elegantan ambijent.</p>",
      heroImage: media.rental.rental || media.rental.building,
      gallery: [media.rental.rental, media.rental.building].filter(Boolean),
      seatedCapacity: 350,
      standingCapacity: 350,
      areaSqm: 500,
      amenities: ["Garderober", "Kafe bar"],
      technicalEquipment: ["Audio sistem", "Ambijentalna rasveta"],
      suitableEventTypes: ["seminar", "modna revija", "koktel", "proslava"],
      accessibilityInfo: "Pristup se dogovara prema konfiguraciji dogadjaja.",
      dressingRooms: "Garderoberi su dostupni po dogovoru.",
      cateringInfo: "Catering se organizuje prema potrebama dogadjaja.",
      barInfo: "Kafe bar je dostupan u okviru prostora.",
      internetInfo: "Internet prikljucak dostupan po dogovoru.",
      avInfo: "Audio sistem i tehnicka podrska dostupni su uz najavu.",
      isFeatured: true,
      displayOrder: 2,
    }),
    upsertRentalSpace({
      title: "Foaje",
      slug: "foaje-madlenianuma",
      shortDescription: "Impozantan prostor u prizemlju kojim dominira unikatni luster dizajnera Boreka Sipeka.",
      description: "<p>U kombinaciji sa prilaznom Pjacetom, Foaje je idealan za ekskluzivne prezentacije, izlozbe, prijeme i koktele.</p>",
      heroImage: media.rental.rental || media.rental.building,
      gallery: [media.rental.rental, media.rental.building].filter(Boolean),
      seatedCapacity: 0,
      standingCapacity: 400,
      areaSqm: 420,
      amenities: ["Otvorene forme", "Spojen sa Pjacetom"],
      technicalEquipment: ["Mobilno ozvucenje", "Ambijentalna rasveta"],
      suitableEventTypes: ["koktel", "promocija", "izlozba", "prijem"],
      accessibilityInfo: "Pristup se dogovara prema konfiguraciji dogadjaja.",
      cateringInfo: "Pogodno za koktel posluzenje.",
      barInfo: "Bar usluga po dogovoru.",
      internetInfo: "Internet dostupan u okviru objekta.",
      avInfo: "Mobilna AV oprema po zahtevu.",
      displayOrder: 3,
    }),
    upsertRentalSpace({
      title: "Sala Studio",
      slug: "sala-studio",
      shortDescription: "Fleksibilan prostor idealan za manje umetnicke produkcije, studijska izvodjenja, strucne seminare i kombinovane dogadjaje.",
      description: "<p>Sala Studio omogucava razlicite konfiguracije gledalista i mobilne pozornice, uz scensku rasvetu prilagodjenu dogadjaju.</p>",
      heroImage: media.rental.guest || media.rental.building,
      gallery: [media.rental.guest, media.rental.building].filter(Boolean),
      seatedCapacity: 160,
      standingCapacity: 160,
      areaSqm: 0,
      amenities: ["Amfiteatarska postavka", "Mobilna pozornica"],
      technicalEquipment: ["Scenska rasveta", "Audio sistem"],
      suitableEventTypes: ["drama", "seminar", "studijsko izvodjenje", "prezentacija"],
      accessibilityInfo: "Pristup se dogovara prema izabranoj postavci.",
      internetInfo: "Internet je dostupan u objektu.",
      avInfo: "Scenska rasveta i audio podrska dostupne su uz tehnicku najavu.",
      displayOrder: 4,
    }),
    upsertRentalSpace({
      title: "Sala Sifnios",
      slug: "sala-sifnios",
      shortDescription: "Multifunkcionalni prostor namenjen pedagoskom i baletskom radu, kao i plenarnim sednicama, master-klasovima i radionicama.",
      description: "<p>Svetao i funkcionalan studio pogodan za mesecni zakup, probe, edukativne programe, radionice i poslovne sastanke.</p>",
      heroImage: media.rental.rental || media.rental.building,
      gallery: [media.rental.rental, media.rental.building].filter(Boolean),
      seatedCapacity: 100,
      standingCapacity: 100,
      areaSqm: 0,
      amenities: ["Baletska i pedagoska sala", "Mesecni zakup"],
      technicalEquipment: ["Ogledala", "Baletski rukohvati"],
      suitableEventTypes: ["radionica", "sastanak", "proba", "master-klas"],
      accessibilityInfo: "Pristup se dogovara prema terminu zakupa.",
      displayOrder: 5,
    }),
    upsertRentalSpace({
      title: "VIP salon",
      slug: "vip-salon",
      shortDescription: "Ekskluzivno opremljen i diskretan prostor za specijalne zvanice, protokolarne sastanke i privatne pauze.",
      description: "<p>VIP salon se nalazi u nivou Velike sale i nudi miran, reprezentativan ambijent za prijem vaznih gostiju i diskretne poslovne susrete.</p>",
      heroImage: media.rental.building || media.rental.rental,
      gallery: [media.rental.building, media.rental.rental].filter(Boolean),
      seatedCapacity: 12,
      standingCapacity: 20,
      areaSqm: 0,
      amenities: ["Ekskluzivna zona", "VIP protokol", "Diskrecija"],
      technicalEquipment: ["Internet", "Direktna komunikacija sa salom"],
      suitableEventTypes: ["protokolarni sastanak", "prijem", "privatna pauza"],
      accessibilityInfo: "Salon je u nivou Velike sale.",
      cateringInfo: "Individualno posluzenje dostupno je po dogovoru.",
      internetInfo: "Internet je dostupan u salonu.",
      displayOrder: 6,
    }),
  ]);

  await SiteSettings.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        "inquiryRecipients.rentalEmails": ["marketing@madlenianum.rs"],
        "inquiryRecipients.eventPlanningEmails": ["marketing@madlenianum.rs"],
      },
    },
    { upsert: true }
  );

  const rentalInquiry = await RentalInquiry.findOneAndUpdate(
    { idempotencyKey: "seed-phase6a-rental-inquiry" },
    {
      referenceNumber: "RNT-SEED-PHASE6A",
      rentalSpace: rentalSpaces[0]._id,
      rentalSpaceSnapshot: {
        rentalSpaceId: rentalSpaces[0]._id,
        title: rentalSpaces[0].title,
        slug: rentalSpaces[0].slug,
        seatedCapacity: rentalSpaces[0].seatedCapacity,
        standingCapacity: rentalSpaces[0].standingCapacity,
      },
      firstName: "Jelena",
      lastName: "Markovic",
      companyName: "Demo Company",
      email: "jelena.markovic@example.com",
      phone: "+381601234567",
      desiredDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      approximateGuestCount: 120,
      note: "Demo upit za zakup prostora.",
      status: "new",
      internalNotes: "Seed demo zapis za Phase 6A.",
      statusHistory: [{ toStatus: "new", source: "seed", reason: "Phase 6A seed." }],
      emailDelivery: { status: "pending" },
      idempotencyKey: "seed-phase6a-rental-inquiry",
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );

  const eventPlanningInquiry = await EventPlanningInquiry.findOneAndUpdate(
    { idempotencyKey: "seed-phase6a-event-planning-inquiry" },
    {
      referenceNumber: "EVP-SEED-PHASE6A",
      firstName: "Nikola",
      lastName: "Petrovic",
      companyName: "Demo Events",
      email: "nikola.petrovic@example.com",
      phone: "+381609876543",
      desiredDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      approximateGuestCount: 220,
      preferredRentalSpace: rentalSpaces[1]?._id,
      preferredRentalSpaceSnapshot: rentalSpaces[1]
        ? { title: rentalSpaces[1].title, slug: rentalSpaces[1].slug }
        : undefined,
      eventType: "korporativni dogadjaj",
      note: "Demo generalni upit za planiranje dogadjaja.",
      status: "new",
      internalNotes: "Seed demo zapis za Phase 6A.",
      statusHistory: [{ toStatus: "new", source: "seed", reason: "Phase 6A seed." }],
      emailDelivery: { status: "pending" },
      idempotencyKey: "seed-phase6a-event-planning-inquiry",
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );

  return {
    costumes,
    propItems,
    rentalSpaces,
    rentalInquiry,
    eventPlanningInquiry,
  };
};

const runStandalone = async () => {
  try {
    await connectDB();
    const result = await runPhase6ASeed();
    console.log("Phase 6A seed completed.");
    console.log({
      costumes: result.costumes.length,
      propScenographyItems: result.propItems.length,
      rentalSpaces: result.rentalSpaces.length,
      rentalInquiry: result.rentalInquiry.referenceNumber,
      eventPlanningInquiry: result.eventPlanningInquiry.referenceNumber,
    });
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Phase 6A seed failed:");
    console.error(error);
    if (mongoose.connection.readyState) await mongoose.disconnect();
    process.exit(1);
  }
};

if (require.main === module) {
  runStandalone();
}

module.exports = {
  runPhase6ASeed,
};
