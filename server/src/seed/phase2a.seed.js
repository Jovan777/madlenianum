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
const EventSeatOverride = require("../models/EventSeatOverride");
const OrderItem = require("../models/OrderItem");
const SeatLock = require("../models/SeatLock");
const seedEnglishContent = require("./seedEnglishContent");

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

// Measured from the approved auditorium plan. Row lengths and offsets are
// intentionally asymmetric and must not be replaced with a rectangular grid.
const parterRowLayout = [
  { row: "I", count: 23, startX: 136, endX: 832, y: 161 },
  { row: "II", count: 24, startX: 120, endX: 848, y: 192 },
  { row: "III", count: 25, startX: 104, endX: 863, y: 224 },
  { row: "IV", count: 26, startX: 89, endX: 879, y: 256 },
  { row: "V", count: 27, startX: 73, endX: 895, y: 287 },
  { row: "VI", count: 28, startX: 57, endX: 911, y: 319 },
  { row: "VII", count: 29, startX: 41, endX: 927, y: 351 },
  { row: "VIII", count: 28, startX: 57, endX: 911, y: 382 },
  { row: "IX", count: 29, startX: 41, endX: 927, y: 414 },
  { row: "X", count: 30, startX: 25, endX: 942, y: 445 },
  { row: "XI", count: 30, startX: 25, endX: 942, y: 530 },
  { row: "XII", count: 29, startX: 41, endX: 927, y: 561 },
  { row: "XIII", count: 29, startX: 41, endX: 927, y: 593 },
  { row: "XIV", count: 28, startX: 57, endX: 911, y: 625 },
  { row: "XV", count: 27, startX: 73, endX: 895, y: 656 },
  { row: "XVI", count: 20, startX: 183, endX: 784, y: 688 },
];

const distributedPosition = (start, end, count, index) => (
  count <= 1 ? start : Math.round(start + ((end - start) * index) / (count - 1))
);

const getOrCreatePriceCategory = async ({ code, name, description }) => {
  const normalizedCode = code.toUpperCase().trim();

  return PriceCategory.findOneAndUpdate(
    { code: normalizedCode },
    {
      code: normalizedCode,
      name,
      description,
      status: "active",
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );
};

const getOrCreateVenue = async () => {
  const existing = await Venue.findOne({ slug: "velika-scena" }).select("translations").lean();
  const english = seedEnglishContent.venues["velika-scena"];
  return Venue.findOneAndUpdate(
    { slug: "velika-scena" },
    {
      name: "Velika scena",
      slug: "velika-scena",
      venueType: "stage",
      capacity: 504,
      hasNumberedSeats: true,
      description:
        "Velika scena Madlenianuma. Osnovni podaci za plan sedišta i cenovnik.",
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
      translations: seedTranslations(
        existing?.translations,
        {
          slug: "velika-scena",
          name: "Velika scena",
          description: "Velika scena Madlenianuma.",
        },
        {
          ...english,
          sections: [
            { name: "Stalls", key: "parter", capacity: 442, isNumbered: true, description: english.sections[0].description },
            { name: "Gallery", key: "galerija", capacity: 62, isNumbered: true, description: english.sections[1].description },
          ],
        }
      ),
      status: "published",
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );
};

const getOrCreateSmallVenue = async () => {
  const existing = await Venue.findOne({ slug: "mala-scena" }).select("translations").lean();
  const english = seedEnglishContent.venues["mala-scena"];
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
          description: "Osnovna sekcija za Malu scenu.",
        },
      ],
      translations: seedTranslations(
        existing?.translations,
        {
          slug: "mala-scena",
          name: "Mala scena",
          description: "Mala scena Madlenianuma.",
        },
        {
          ...english,
          sections: [
            { name: "Studio Stage", key: "mala-scena", capacity: 0, isNumbered: false, description: english.sections[0].description },
          ],
        }
      ),
      status: "published",
    },
    {
      returnDocument: "after",
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
  const validFrom = new Date();
  validFrom.setDate(validFrom.getDate() - 30);
  validFrom.setHours(0, 0, 0, 0);
  const validTo = new Date();
  validTo.setFullYear(validTo.getFullYear() + 2);
  validTo.setHours(23, 59, 59, 999);

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
      validFrom,
      validTo,
      revision: 1,
    },
    {
      returnDocument: "after",
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
        "Plan sedišta za Veliku scenu na osnovu javno dostupnog rasporeda: Parter 442, Galerija 62.",
      canvas: {
        width: 1320,
        height: 850,
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
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );
};

const buildParterSeats = ({ seatMap, venue, categoryII, categoryI, categoryIII }) => {
  const seats = [];

  parterRowLayout.forEach((layout, rowIndex) => {
    for (let seatNumber = 1; seatNumber <= layout.count; seatNumber += 1) {
      const x = distributedPosition(
        layout.startX,
        layout.endX,
        layout.count,
        seatNumber - 1
      );
      const side = x < 485 ? "left" : x > 515 ? "right" : "center";

      seats.push({
        seatMap: seatMap._id,
        venue: venue._id,
        section: "Parter",
        row: layout.row,
        number: seatNumber,
        label: `${layout.row}-${seatNumber}`,
        seatType: "standard",
        priceCategory: categoryII._id,
        x,
        y: layout.y,
        width: 22,
        height: 22,
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
      positions: [
        { x: 67, y: 772 },
        { x: 99, y: 772 },
        { x: 152, y: 772 },
        { x: 183, y: 772 },
      ],
      category: categoryI._id,
    },
    {
      boxName: "Loža parter desno",
      count: 4,
      positions: [
        { x: 784, y: 772 },
        { x: 816, y: 772 },
        { x: 784, y: 804 },
        { x: 816, y: 804 },
      ],
      category: categoryI._id,
    },
    {
      boxName: "Pomoćna loža parter",
      count: 2,
      positions: [
        { x: 67, y: 804 },
        { x: 99, y: 804 },
      ],
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
        x: box.positions[i - 1].x,
        y: box.positions[i - 1].y,
        width: 22,
        height: 22,
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

  for (let box = 1; box <= 12; box += 1) {
    const isLeft = box <= 4;
    const isRight = box >= 5 && box <= 8;
    const bottomBoxX = {
      9: 240,
      10: 390,
      11: 860,
      12: 1010,
    };
    const boxX = isLeft
      ? 80
      : isRight
        ? 1240
        : bottomBoxX[box];
    const boxY = isLeft
      ? 145 + (box - 1) * 145
      : isRight
        ? 145 + (box - 5) * 145
        : 780;

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
        x: boxX + ((seat - 1) % 2) * 38,
        y: boxY + (seat > 2 ? 38 : 0),
        width: 32,
        height: 32,
        rotation: 0,
        sortOrder: 3000 + box * 10 + seat,
        isActive: true,
        isSellable: true,
      });
    }
  }

  for (let sideBox = 1; sideBox <= 2; sideBox += 1) {
    const boxX = sideBox === 1 ? 1160 : 540;

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
        x: boxX + ((seat - 1) % 2) * 38,
        y: 780 + (seat > 2 ? 38 : 0),
        width: 32,
        height: 32,
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
      x: 670 + ((seat - 1) % 4) * 38,
      y: 780 + (seat > 4 ? 38 : 0),
      width: 32,
      height: 32,
      rotation: 0,
      sortOrder: 5000 + seat,
      isActive: true,
      isSellable: true,
    });
  }

  return seats;
};

const migrateOverridesFromRetiredSeats = async ({
  retiredSeats,
  retainedSeats,
}) => {
  if (!retiredSeats.length) {
    return 0;
  }

  const retiredSeatById = new Map(
    retiredSeats.map((seat) => [String(seat._id), seat])
  );
  const overrides = await EventSeatOverride.find({
    seat: { $in: retiredSeats.map((seat) => seat._id) },
  }).sort("event seat createdAt _id");

  if (!overrides.length) {
    return 0;
  }

  const retainedByRow = new Map();
  retainedSeats.forEach((seat) => {
    const current = retainedByRow.get(seat.row) || [];
    current.push(seat);
    retainedByRow.set(seat.row, current);
  });
  retainedByRow.forEach((seats) => {
    seats.sort((left, right) => Number(left.number) - Number(right.number));
  });

  const eventIds = [...new Set(overrides.map((override) => String(override.event)))];
  const retainedIds = retainedSeats.map((seat) => seat._id);
  const [existingOverrides, occupiedItems] = await Promise.all([
    EventSeatOverride.find({
      event: { $in: eventIds },
      seat: { $in: retainedIds },
    }).select("event seat type active"),
    OrderItem.find({
      event: { $in: eventIds },
      seat: { $in: retainedIds },
      status: { $nin: ["cancelled", "refunded"] },
    }).select("event seat"),
  ]);

  const unavailableTargets = new Set([
    ...existingOverrides.map((override) => (
      `${override.event}:${override.seat}`
    )),
    ...occupiedItems.map((item) => `${item.event}:${item.seat}`),
  ]);
  const existingOverrideByTarget = new Map(
    existingOverrides.map((override) => [
      `${override.event}:${override.seat}`,
      override,
    ])
  );
  const plannedTargets = new Set();
  const overridesByEventAndRow = new Map();

  overrides.forEach((override) => {
    const retiredSeat = retiredSeatById.get(String(override.seat));
    const key = `${override.event}:${retiredSeat.row}`;
    const current = overridesByEventAndRow.get(key) || [];
    current.push({ override, retiredSeat });
    overridesByEventAndRow.set(key, current);
  });

  const operations = [];
  overridesByEventAndRow.forEach((entries) => {
    const row = entries[0].retiredSeat.row;
    const eventId = String(entries[0].override.event);
    const rowSeats = retainedByRow.get(row) || [];
    const candidates = [...rowSeats]
      .reverse()
      .filter((seat) => {
        const key = `${eventId}:${seat._id}`;
        return !unavailableTargets.has(key) && !plannedTargets.has(key);
      })
      .slice(0, entries.length)
      .reverse();

    if (candidates.length !== entries.length) {
      const sourceTypes = new Set(entries.map(({ override }) => override.type));
      const fullRowAlreadyCovered = sourceTypes.size === 1
        && rowSeats.every((seat) => {
          const existing = existingOverrideByTarget.get(`${eventId}:${seat._id}`);
          return existing?.active && existing.type === entries[0].override.type;
        });

      if (fullRowAlreadyCovered) {
        entries.forEach(({ override }) => {
          operations.push({
            deleteOne: {
              filter: { _id: override._id },
            },
          });
        });
        return;
      }

      throw new Error(
        `Cannot safely relocate EventSeatOverrides from retired row ${row}.`
      );
    }

    entries
      .sort((left, right) => (
        Number(left.retiredSeat.number) - Number(right.retiredSeat.number)
      ))
      .forEach(({ override }, index) => {
        const target = candidates[index];
        plannedTargets.add(`${eventId}:${target._id}`);
        operations.push({
          updateOne: {
            filter: { _id: override._id },
            update: {
              $set: {
                seat: target._id,
                seatMap: target.seatMap,
              },
            },
          },
        });
      });
  });

  if (operations.length) {
    await EventSeatOverride.bulkWrite(operations, { ordered: true });
  }

  return operations.length;
};

const seedSeats = async ({ seatMap, venue, categoryI, categoryII, categoryIII }) => {
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
  const existingSeats = await Seat.find({ seatMap: seatMap._id }).sort("sortOrder _id");
  const targetLabels = new Set(seats.map((seat) => seat.label));
  const existingByLabel = new Map(existingSeats.map((seat) => [seat.label, seat]));
  const missingTargets = seats.filter((seat) => !existingByLabel.has(seat.label));
  const reusableSeats = existingSeats.filter((seat) => !targetLabels.has(seat.label));

  if (reusableSeats.length) {
    const reusableIds = reusableSeats.map((seat) => seat._id);
    const [orderItems, locks] = await Promise.all([
      OrderItem.countDocuments({ seat: { $in: reusableIds } }),
      SeatLock.countDocuments({ seat: { $in: reusableIds } }),
    ]);

    if (orderItems || locks) {
      throw new Error(
        "The corrected auditorium layout cannot reuse seats referenced by "
        + `ticketing history (orders: ${orderItems}, locks: ${locks}).`
      );
    }

    await migrateOverridesFromRetiredSeats({
      retiredSeats: reusableSeats,
      retainedSeats: existingSeats.filter((seat) => targetLabels.has(seat.label)),
    });

    await Seat.bulkWrite(
      reusableSeats.map((seat) => ({
        updateOne: {
          filter: { _id: seat._id },
          update: {
            $set: {
              label: `__phase2a_layout_${seat._id}`,
              section: "__layout_reconciliation__",
              row: "",
              number: null,
              isActive: false,
              isSellable: false,
            },
          },
        },
      })),
      { ordered: true }
    );
  }

  const reassignedByLabel = new Map(
    missingTargets.map((seat, index) => [seat.label, reusableSeats[index]])
  );
  await Seat.bulkWrite(
    seats.map((seat) => {
      const existing = existingByLabel.get(seat.label) || reassignedByLabel.get(seat.label);
      return {
        updateOne: {
          filter: existing ? { _id: existing._id } : { seatMap: seatMap._id, label: seat.label },
          update: { $set: seat },
          upsert: !existing,
        },
      };
    }),
    { ordered: true }
  );

  const unusedReusableSeats = reusableSeats.slice(missingTargets.length);
  if (unusedReusableSeats.length) {
    await Seat.updateMany(
      { _id: { $in: unusedReusableSeats.map((seat) => seat._id) } },
      { $set: { isActive: false, isSellable: false } }
    );
  }

  return {
    parter: parterSeats.length,
    gallery: gallerySeats.length,
    total: seats.length,
  };
};

const getOrCreateGiulioCesareProduction = async (venue) => {
  const slug = "julije-cezar-u-egiptu";
  const existing = await Production.findOne({ slug }).select("translations").lean();
  return Production.findOneAndUpdate(
    { slug },
    {
      title: "JULIJE CEZAR U EGIPTU",
      slug,
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
      translations: seedTranslations(
        existing?.translations,
        {
          slug,
          title: "JULIJE CEZAR U EGIPTU",
          authorComposer: "Georg Fridrih Hendl",
          originalTitle: "Giulio Cesare in Egitto",
          subtitle: "Barokna opera u tri cina",
          shortDescription: "Jedno od najznacajnijih dela barokne opere i vrhunac Hendelovog opernog stvaralastva.",
          description: "Barokna opera Giulio Cesare in Egitto prati istorijski susret rimskog vojskovodje Julija Cezara i egipatske kraljice Kleopatre.",
          synopsis: "Politicke intrige, borba za vlast, izdaja i osveta cine okvir u kojem se razvija snazna ljubavna prica.",
          performanceLanguage: "sr",
          season: "2025/2026",
          tags: ["opera", "premijera", "barokna opera", "velika scena"],
        },
        seedEnglishContent.productions[slug]
      ),
      seo: {
        title: "JULIJE CEZAR U EGIPTU | Madlenianum",
        description:
          "Barokna opera Georga Fridriha Hendla na Velikoj sceni Madlenianuma.",
        keywords: ["Madlenianum", "opera", "Julije Cezar u Egiptu", "Hendl"],
      },
      status: "published",
      isFeatured: true,
    },
    {
      returnDocument: "after",
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
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 28);
  startsAt.setHours(18, 30, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
  const saleStartsAt = new Date();
  saleStartsAt.setHours(0, 0, 0, 0);
  const saleEndsAt = new Date(startsAt.getTime() - 30 * 60 * 1000);

  return Event.findOneAndUpdate(
    {
      production: production._id,
      notes: { $regex: "^Premijera opere Julije Cezar" },
    },
    {
      production: production._id,
      venue: venue._id,
      startsAt,
      endsAt,
      isPremiere: true,
      badge: "PREMIJERA",
      status: "scheduled",
      saleStatus: "on_sale",
      seatMap: seatMap._id,
      pricePlan: pricePlan._id,
      saleStartsAt,
      saleEndsAt,
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
        "Premijera opere Julije Cezar u Egiptu. Seed podaci za proveru sedišta i cena.",
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
    });

    const categoryII = await getOrCreatePriceCategory({
      code: "II",
      name: "II kategorija",
      description: "Parter i II red loža.",
    });

    const categoryIII = await getOrCreatePriceCategory({
      code: "III",
      name: "III kategorija",
      description: "Pomoćne stolice u ložama.",
    });

    const categoryAll = await getOrCreatePriceCategory({
      code: "ALL",
      name: "Sva mesta",
      description: "Jedinstvena cena za sva mesta.",
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
    console.log("Verification endpoint:");
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
