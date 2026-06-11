const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const connectDB = require("../config/db");

const Venue = require("../models/Venue");
const PriceCategory = require("../models/PriceCategory");
const PricePlan = require("../models/PricePlan");
const SeatMap = require("../models/SeatMap");
const Seat = require("../models/Seat");
const Production = require("../models/Production");
const Event = require("../models/Event");

const romanRows = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
];

const getOrCreatePriceCategory = async ({ code, name, description, weight }) => {
  const normalizedCode = code.toUpperCase().trim();

  return PriceCategory.findOneAndUpdate(
    { code: normalizedCode },
    {
      code: normalizedCode,
      name,
      description,
      weight,
      status: "active",
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );
};

const getOrCreateVenue = async () => {
  return Venue.findOneAndUpdate(
    { slug: "velika-scena" },
    {
      name: "Velika scena",
      slug: "velika-scena",
      venueType: "stage",
      capacity: 504,
      hasNumberedSeats: true,
      description:
        "Velika scena Madlenianuma. Test podaci za plan sedišta i cenovnik.",
      sections: [
        {
          name: "Parter",
          key: "parter",
          capacity: 442,
          isNumbered: true,
          description: "XVI redova - 432 sedišta i 3 lože - 10 sedišta.",
        },
        {
          name: "Galerija",
          key: "galerija",
          capacity: 62,
          isNumbered: true,
          description:
            "12 loža x 4 sedišta, 2 lože x 3 sedišta i centralna loža od 8 sedišta.",
        },
      ],
      status: "published",
      weight: 1,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );
};

const getOrCreateSmallVenue = async () => {
  return Venue.findOneAndUpdate(
    { slug: "mala-scena" },
    {
      name: "Mala scena",
      slug: "mala-scena",
      venueType: "stage",
      capacity: 0,
      hasNumberedSeats: false,
      description:
        "Mala scena Madlenianuma. Kapacitet i raspored se mogu dopuniti kasnije.",
      sections: [
        {
          name: "Mala scena",
          key: "mala-scena",
          capacity: 0,
          isNumbered: false,
          description: "Test sekcija za Malu scenu.",
        },
      ],
      status: "published",
      weight: 2,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );
};

const createPricePlan = async ({
  name,
  productionTypes,
  venue,
  isPremiere,
  rules,
  notes,
}) => {
  return PricePlan.findOneAndUpdate(
    { name },
    {
      name,
      productionTypes,
      venue,
      isPremiere,
      currency: "RSD",
      rules,
      notes,
      status: "active",
      validFrom: new Date("2025-11-20T00:00:00.000Z"),
      validTo: new Date("2026-12-31T23:59:59.999Z"),
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  ).populate("rules.priceCategory");
};

const getOrCreateSeatMap = async (venue) => {
  return SeatMap.findOneAndUpdate(
    {
      venue: venue._id,
      slug: "velika-scena-2025-2026",
    },
    {
      venue: venue._id,
      name: "Velika scena - sezona 2025/2026",
      slug: "velika-scena-2025-2026",
      description:
        "Test plan sedišta za Veliku scenu na osnovu javno dostupnog rasporeda: Parter 442, Galerija 62.",
      canvas: {
        width: 1400,
        height: 1000,
      },
      sections: [
        {
          key: "parter",
          name: "Parter",
          capacity: 442,
          description: "XVI redova - 432 sedišta i 3 lože - 10 sedišta.",
          order: 1,
        },
        {
          key: "galerija",
          name: "Galerija",
          capacity: 62,
          description:
            "12 loža x 4 sedišta, 2 lože x 3 sedišta i centralna loža od 8 sedišta.",
          order: 2,
        },
      ],
      status: "active",
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );
};

const buildParterSeats = ({ seatMap, venue, categoryII, categoryI, categoryIII }) => {
  const seats = [];

  const startX = 210;
  const startY = 220;
  const gapX = 34;
  const gapY = 34;

  romanRows.forEach((rowLabel, rowIndex) => {
    for (let seatNumber = 1; seatNumber <= 27; seatNumber += 1) {
      const side = seatNumber <= 13 ? "left" : seatNumber === 14 ? "center" : "right";

      seats.push({
        seatMap: seatMap._id,
        venue: venue._id,
        section: "Parter",
        row: rowLabel,
        number: seatNumber,
        label: `${rowLabel}-${seatNumber}`,
        seatType: "standard",
        priceCategory: categoryII._id,
        x: startX + (seatNumber - 1) * gapX,
        y: startY + rowIndex * gapY,
        width: 24,
        height: 24,
        rotation: 0,
        sortOrder: rowIndex * 100 + seatNumber,
        isActive: true,
        isSellable: true,
        visualGroup: side,
      });
    }
  });

  const boxSeats = [
    {
      boxName: "Loža parter levo",
      count: 4,
      x: 80,
      y: 320,
      category: categoryI._id,
    },
    {
      boxName: "Loža parter desno",
      count: 4,
      x: 1180,
      y: 320,
      category: categoryI._id,
    },
    {
      boxName: "Pomoćna loža parter",
      count: 2,
      x: 630,
      y: 800,
      category: categoryIII._id,
    },
  ];

  boxSeats.forEach((box, boxIndex) => {
    for (let i = 1; i <= box.count; i += 1) {
      seats.push({
        seatMap: seatMap._id,
        venue: venue._id,
        section: "Parter loža",
        row: `L${boxIndex + 1}`,
        number: i,
        label: `${box.boxName} ${i}`,
        seatType: box.category.equals?.(categoryIII._id) ? "auxiliary" : "box",
        priceCategory: box.category,
        x: box.x + (i - 1) * 30,
        y: box.y,
        width: 24,
        height: 24,
        rotation: 0,
        sortOrder: 2000 + boxIndex * 100 + i,
        isActive: true,
        isSellable: true,
      });
    }
  });

  return seats;
};

const buildGallerySeats = ({ seatMap, venue, categoryI, categoryII, categoryIII }) => {
  const seats = [];

  const galleryY = 80;

  for (let box = 1; box <= 12; box += 1) {
    const isLeft = box <= 6;
    const boxX = isLeft ? 120 + (box - 1) * 70 : 760 + (box - 7) * 70;

    for (let seat = 1; seat <= 4; seat += 1) {
      const isFirstRow = seat <= 2;

      seats.push({
        seatMap: seatMap._id,
        venue: venue._id,
        section: "Galerija loža",
        row: `GL${box}`,
        number: seat,
        label: `Galerija loža ${box}-${seat}`,
        seatType: "box",
        priceCategory: isFirstRow ? categoryI._id : categoryII._id,
        x: boxX + (seat - 1) * 16,
        y: galleryY,
        width: 22,
        height: 22,
        rotation: 0,
        sortOrder: 3000 + box * 10 + seat,
        isActive: true,
        isSellable: true,
      });
    }
  }

  for (let sideBox = 1; sideBox <= 2; sideBox += 1) {
    const boxX = sideBox === 1 ? 530 : 700;

    for (let seat = 1; seat <= 3; seat += 1) {
      seats.push({
        seatMap: seatMap._id,
        venue: venue._id,
        section: "Galerija bočna loža",
        row: `GB${sideBox}`,
        number: seat,
        label: `Galerija bočna loža ${sideBox}-${seat}`,
        seatType: "box",
        priceCategory: categoryII._id,
        x: boxX + (seat - 1) * 20,
        y: 135,
        width: 22,
        height: 22,
        rotation: 0,
        sortOrder: 4000 + sideBox * 10 + seat,
        isActive: true,
        isSellable: true,
      });
    }
  }

  for (let seat = 1; seat <= 8; seat += 1) {
    seats.push({
      seatMap: seatMap._id,
      venue: venue._id,
      section: "Centralna loža",
      row: "CL",
      number: seat,
      label: `Centralna loža ${seat}`,
      seatType: seat <= 6 ? "central_box" : "auxiliary",
      priceCategory: seat <= 6 ? categoryI._id : categoryIII._id,
      x: 585 + (seat - 1) * 28,
      y: 60,
      width: 22,
      height: 22,
      rotation: 0,
      sortOrder: 5000 + seat,
      isActive: true,
      isSellable: true,
    });
  }

  return seats;
};

const seedSeats = async ({ seatMap, venue, categoryI, categoryII, categoryIII }) => {
  await Seat.deleteMany({ seatMap: seatMap._id });

  const parterSeats = buildParterSeats({
    seatMap,
    venue,
    categoryI,
    categoryII,
    categoryIII,
  });

  const gallerySeats = buildGallerySeats({
    seatMap,
    venue,
    categoryI,
    categoryII,
    categoryIII,
  });

  const seats = [...parterSeats, ...gallerySeats];

  await Seat.insertMany(seats, { ordered: false });

  return {
    parter: parterSeats.length,
    gallery: gallerySeats.length,
    total: seats.length,
  };
};

const getOrCreateGiulioCesareProduction = async (venue) => {
  return Production.findOneAndUpdate(
    { slug: "julije-cezar-u-egiptu" },
    {
      title: "JULIJE CEZAR U EGIPTU",
      slug: "julije-cezar-u-egiptu",
      type: "opera",
      authorComposer: "Georg Fridrih Hendl",
      originalTitle: "Giulio Cesare in Egitto",
      subtitle: "Barokna opera u tri čina",
      shortDescription:
        "Jedno od najznačajnijih dela barokne opere i vrhunac Hendelovog opernog stvaralaštva.",
      description:
        "Barokna opera Giulio Cesare in Egitto predstavlja jedno od najizvođenijih ostvarenja operskog repertoara XVIII veka. Radnja je smeštena u Egipat, u vreme istorijskog susreta rimskog vojskovođe Julija Cezara i egipatske kraljice Kleopatre. Produkcija nastavlja saradnju Nove beogradske opere i Opere i teatra Madlenianum.",
      synopsis:
        "Cezar ulazi u Aleksandriju sa svojom vojskom. Političke intrige, borba za vlast, izdaja i osveta čine okvir u kojem se razvija snažna ljubavna priča.",
      premiereDate: new Date("2026-01-26T18:30:00.000Z"),
      isPremiere: true,
      isOnRepertoire: true,
      venue: venue._id,
      durationMinutes: 180,
      performanceLanguage: "sr",
      subtitles: "",
      creativeTeam: [
        {
          role: "Muzika",
          name: "George Frideric Handel",
          order: 1,
        },
        {
          role: "Libreto",
          name: "Nicola Francesco Haym",
          order: 2,
        },
        {
          role: "Dirigent i muzičko vođstvo",
          name: "Predrag Gosta",
          order: 3,
        },
        {
          role: "Reditelj",
          name: "Ilija Roitman",
          order: 4,
        },
        {
          role: "Scenografija i kostimi",
          name: "Tijana Trailović",
          order: 5,
        },
        {
          role: "Koncertmajstor",
          name: "Simone Pirri",
          order: 6,
        },
        {
          role: "Korepetitor",
          name: "Dušan Toroman",
          order: 7,
        },
        {
          role: "Priprema hora",
          name: "Timur Musaev",
          order: 8,
        },
        {
          role: "Koreograf",
          name: "Anja Stojankić",
          order: 9,
        },
      ],
      cast: [
        {
          character: "Giulio Cesare",
          names: ["Sandro Rossi"],
          order: 1,
        },
        {
          character: "Cleopatra",
          names: ["Radoslava Vorgić"],
          order: 2,
        },
        {
          character: "Sesto Pompeo",
          names: ["Silvija Radjen Kumar"],
          order: 3,
        },
        {
          character: "Tolomeo",
          names: ["Julia Portela Piñón"],
          order: 4,
        },
        {
          character: "Cornelia",
          names: ["Federica Moi"],
          order: 5,
        },
        {
          character: "Achilla",
          names: ["Sreten Manojlović"],
          order: 6,
        },
      ],
      season: "2025/2026",
      tags: ["opera", "premijera", "barokna opera", "velika scena"],
      seo: {
        title: "JULIJE CEZAR U EGIPTU | Madlenianum",
        description:
          "Barokna opera Georga Fridriha Hendla na Velikoj sceni Madlenianuma.",
        keywords: ["Madlenianum", "opera", "Julije Cezar u Egiptu", "Hendl"],
      },
      status: "published",
      isFeatured: true,
      weight: 1,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );
};

const getOrCreateGiulioCesareEvent = async ({
  production,
  venue,
  seatMap,
  pricePlan,
}) => {
  return Event.findOneAndUpdate(
    {
      production: production._id,
      startsAt: new Date("2026-01-26T18:30:00.000Z"),
    },
    {
      production: production._id,
      venue: venue._id,
      startsAt: new Date("2026-01-26T18:30:00.000Z"),
      endsAt: new Date("2026-01-26T21:30:00.000Z"),
      isPremiere: true,
      badge: "PREMIJERA",
      status: "scheduled",
      saleStatus: "on_sale",
      seatMap: seatMap._id,
      pricePlan: pricePlan._id,
      saleStartsAt: new Date("2025-11-20T00:00:00.000Z"),
      saleEndsAt: new Date("2026-01-26T18:00:00.000Z"),
      maxTicketsPerOrder: 4,
      lockDurationMinutes: 15,
      ticketing: {
        enabled: true,
        provider: "internal",
        legacyEventId: "JULIJE-CEZAR-2026-01-26",
        externalCheckoutUrl: "",
        note: "Seed event. Provider can later be switched to legacy_php.",
      },
      basePrice: {
        amount: 2300,
        currency: "RSD",
      },
      notes:
        "Premijera opere Julije Cezar u Egiptu. Seed podaci za testiranje sedišta i cena.",
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  )
    .populate("production")
    .populate("venue")
    .populate("seatMap")
    .populate("pricePlan");
};

const seedPhase2A = async () => {
  try {
    await connectDB();

    const venue = await getOrCreateVenue();
    const smallVenue = await getOrCreateSmallVenue();

    const categoryI = await getOrCreatePriceCategory({
      code: "I",
      name: "I kategorija",
      description: "I red loža / najbolja sedišta.",
      weight: 1,
    });

    const categoryII = await getOrCreatePriceCategory({
      code: "II",
      name: "II kategorija",
      description: "Parter i II red loža.",
      weight: 2,
    });

    const categoryIII = await getOrCreatePriceCategory({
      code: "III",
      name: "III kategorija",
      description: "Pomoćne stolice u ložama.",
      weight: 3,
    });

    const categoryAll = await getOrCreatePriceCategory({
      code: "ALL",
      name: "Sva mesta",
      description: "Jedinstvena cena za sva mesta.",
      weight: 10,
    });

    const operaRegularPlan = await createPricePlan({
      name: "Opera, opereta i balet - Velika scena - regular",
      productionTypes: ["opera", "opereta", "balet"],
      venue: venue._id,
      isPremiere: false,
      rules: [
        {
          priceCategory: categoryI._id,
          amount: 2200,
          label: "I red loža",
        },
        {
          priceCategory: categoryII._id,
          amount: 2000,
          label: "Parter i II red loža",
        },
        {
          priceCategory: categoryIII._id,
          amount: 1300,
          label: "Pomoćne stolice u ložama",
        },
      ],
      notes: "Cene za operu, operetu i balet na Velikoj sceni.",
    });

    const operaPremierePlan = await createPricePlan({
      name: "Opera, opereta i balet - Velika scena - premijera",
      productionTypes: ["opera", "opereta", "balet"],
      venue: venue._id,
      isPremiere: true,
      rules: [
        {
          priceCategory: categoryI._id,
          amount: 2500,
          label: "I red loža",
        },
        {
          priceCategory: categoryII._id,
          amount: 2300,
          label: "Parter i II red loža",
        },
        {
          priceCategory: categoryIII._id,
          amount: 1600,
          label: "Pomoćne stolice u ložama",
        },
      ],
      notes: "Premijerne cene za operu, operetu i balet na Velikoj sceni.",
    });

    const musicalRegularPlan = await createPricePlan({
      name: "Mjuzikl - Velika scena - regular",
      productionTypes: ["mjuzikl"],
      venue: venue._id,
      isPremiere: false,
      rules: [
        {
          priceCategory: categoryI._id,
          amount: 2300,
          label: "I red loža",
        },
        {
          priceCategory: categoryII._id,
          amount: 2100,
          label: "Parter i II red loža",
        },
        {
          priceCategory: categoryIII._id,
          amount: 1400,
          label: "Pomoćne stolice u ložama",
        },
      ],
      notes: "Cene za mjuzikle na Velikoj sceni.",
    });

    const musicalPremierePlan = await createPricePlan({
      name: "Mjuzikl - Velika scena - premijera",
      productionTypes: ["mjuzikl"],
      venue: venue._id,
      isPremiere: true,
      rules: [
        {
          priceCategory: categoryI._id,
          amount: 3100,
          label: "I red loža",
        },
        {
          priceCategory: categoryII._id,
          amount: 2900,
          label: "Parter i II red loža",
        },
        {
          priceCategory: categoryIII._id,
          amount: 1700,
          label: "Pomoćne stolice u ložama",
        },
      ],
      notes: "Premijerne cene za mjuzikle na Velikoj sceni.",
    });

    const dramaRegularPlan = await createPricePlan({
      name: "Drama - Velika scena - regular",
      productionTypes: ["drama"],
      venue: venue._id,
      isPremiere: false,
      rules: [
        {
          priceCategory: categoryI._id,
          amount: 2100,
          label: "I red loža",
        },
        {
          priceCategory: categoryII._id,
          amount: 1900,
          label: "Parter i II red loža",
        },
        {
          priceCategory: categoryIII._id,
          amount: 1300,
          label: "Pomoćne stolice u ložama",
        },
      ],
      notes: "Cene za dramske predstave na Velikoj sceni.",
    });

    const dramaPremierePlan = await createPricePlan({
      name: "Drama - Velika scena - premijera",
      productionTypes: ["drama"],
      venue: venue._id,
      isPremiere: true,
      rules: [
        {
          priceCategory: categoryI._id,
          amount: 2300,
          label: "I red loža",
        },
        {
          priceCategory: categoryII._id,
          amount: 2100,
          label: "Parter i II red loža",
        },
        {
          priceCategory: categoryIII._id,
          amount: 1500,
          label: "Pomoćne stolice u ložama",
        },
      ],
      notes: "Premijerne cene za dramske predstave na Velikoj sceni.",
    });

    const smallStageDramaPlan = await createPricePlan({
      name: "Drama - Mala scena - regular",
      productionTypes: ["drama"],
      venue: smallVenue._id,
      isPremiere: false,
      rules: [
        {
          priceCategory: categoryAll._id,
          amount: 1700,
          label: "Sva mesta",
        },
      ],
      notes: "Dramske predstave na Maloj sceni.",
    });

    const smallStagePremierePlan = await createPricePlan({
      name: "Drama - Mala scena - premijera",
      productionTypes: ["drama"],
      venue: smallVenue._id,
      isPremiere: true,
      rules: [
        {
          priceCategory: categoryAll._id,
          amount: 1900,
          label: "Sva mesta",
        },
      ],
      notes: "Premijerne predstave na Maloj sceni.",
    });

    const concertPlan = await createPricePlan({
      name: "Koncert - jedinstvena cena - 1800",
      productionTypes: ["koncert"],
      venue: venue._id,
      isPremiere: false,
      rules: [
        {
          priceCategory: categoryAll._id,
          amount: 1800,
          label: "Sva mesta",
        },
      ],
      notes: "Primer jedinstvene cene za koncert.",
    });

    const seatMap = await getOrCreateSeatMap(venue);

    const seatStats = await seedSeats({
      seatMap,
      venue,
      categoryI,
      categoryII,
      categoryIII,
    });

    const production = await getOrCreateGiulioCesareProduction(venue);

    const event = await getOrCreateGiulioCesareEvent({
      production,
      venue,
      seatMap,
      pricePlan: operaPremierePlan,
    });

    console.log("Phase 2A seed completed.");
    console.log("");
    console.log("Created / updated:");
    console.log({
      venueId: venue._id.toString(),
      smallVenueId: smallVenue._id.toString(),
      seatMapId: seatMap._id.toString(),
      productionId: production._id.toString(),
      eventId: event._id.toString(),
      seatStats,
    });

    console.log("");
    console.log("Price plans:");
    console.log({
      operaRegularPlan: operaRegularPlan._id.toString(),
      operaPremierePlan: operaPremierePlan._id.toString(),
      musicalRegularPlan: musicalRegularPlan._id.toString(),
      musicalPremierePlan: musicalPremierePlan._id.toString(),
      dramaRegularPlan: dramaRegularPlan._id.toString(),
      dramaPremierePlan: dramaPremierePlan._id.toString(),
      smallStageDramaPlan: smallStageDramaPlan._id.toString(),
      smallStagePremierePlan: smallStagePremierePlan._id.toString(),
      concertPlan: concertPlan._id.toString(),
    });

    console.log("");
    console.log("Test endpoint:");
    console.log(
      `GET http://localhost:${process.env.PORT || 5000}/api/public/events/${event._id.toString()}/seats`
    );

    process.exit(0);
  } catch (error) {
    console.error("Phase 2A seed failed:");
    console.error(error);
    process.exit(1);
  }
};

seedPhase2A();