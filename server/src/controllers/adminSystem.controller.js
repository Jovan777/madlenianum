const asyncHandler = require("../utils/asyncHandler");

const Production = require("../models/Production");
const Artist = require("../models/Artist");
const Event = require("../models/Event");
const Venue = require("../models/Venue");
const SeatMap = require("../models/SeatMap");
const Seat = require("../models/Seat");
const PriceCategory = require("../models/PriceCategory");
const PricePlan = require("../models/PricePlan");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const SeatLock = require("../models/SeatLock");
const EventSeatOverride = require("../models/EventSeatOverride");
const {
  validateEventConfiguration,
  validatePricePlanPayload,
} = require("../services/ticketingConfiguration.service");
const {
  calculateEffectiveSeatStates,
} = require("../services/effectiveSeatState.service");
const {
  getSeatMapWarnings,
} = require("../services/seatMapAdministration.service");

const getAdminSystemStatus = asyncHandler(async (req, res) => {
  const now = new Date();
  const [
    productionsCount,
    artistsCount,
    events,
    venuesCount,
    seatMaps,
    seatsCount,
    priceCategoriesCount,
    pricePlans,
    customersCount,
    ordersCount,
    orderItemsCount,
    activeLocksCount,
    overrides,
  ] = await Promise.all([
    Production.countDocuments(),
    Artist.countDocuments(),
    Event.find().populate("production").populate("venue").populate("seatMap").populate({
      path: "pricePlan",
      populate: "rules.priceCategory",
    }),
    Venue.countDocuments(),
    SeatMap.find().populate("venue"),
    Seat.countDocuments(),
    PriceCategory.countDocuments(),
    PricePlan.find().populate("venue").populate("rules.priceCategory"),
    Customer.countDocuments(),
    Order.countDocuments(),
    OrderItem.countDocuments(),
    SeatLock.countDocuments({ status: "active", expiresAt: { $gt: now } }),
    EventSeatOverride.find()
      .populate("event", "seatMap venue startsAt status saleStatus")
      .populate("seat", "seatMap label"),
  ]);

  const warningItems = [];
  const warningCounts = {};
  const addWarning = (problem, targetType, target) => {
    warningCounts[problem.code] = (warningCounts[problem.code] || 0) + 1;
    warningItems.push({
      code: problem.code,
      field: problem.field,
      message: problem.message,
      targetType,
      targetId: String(target._id),
      targetLabel: targetType === "event"
        ? `${target.production?.title || "Termin"} - ${new Date(target.startsAt).toLocaleString("sr-RS")}`
        : target.name,
      link: targetType === "event"
        ? `/admin/events/${target._id}`
        : targetType === "seatMap"
          ? `/admin/seat-maps/${target._id}/map`
          : `/admin/price-plans/${target._id}/edit`,
    });
  };

  for (const event of events) {
    const result = await validateEventConfiguration({}, { existingEvent: event });
    [...result.errors, ...result.warnings].forEach((problem) => addWarning(problem, "event", event));
  }
  for (const pricePlan of pricePlans) {
    const result = await validatePricePlanPayload({}, { existingPlan: pricePlan });
    result.warnings.forEach((problem) => addWarning(problem, "pricePlan", pricePlan));
  }
  for (const seatMap of seatMaps) {
    const mapWarnings = await getSeatMapWarnings(seatMap);
    mapWarnings.forEach((problem) => addWarning(problem, "seatMap", seatMap));
  }
  for (const override of overrides) {
    if (!override.event || !override.seat) {
      const target = seatMaps.find((map) => String(map._id) === String(override.seatMap));
      if (target) {
        addWarning({
          code: "invalid_override_reference",
          field: "eventSeatOverride",
          message: "Izuzetak sedišta referencira obrisan termin ili sedište.",
        }, "seatMap", target);
      }
      continue;
    }
    if (String(override.event.seatMap) !== String(override.seatMap)
        || String(override.seat.seatMap) !== String(override.seatMap)) {
      const target = seatMaps.find((map) => String(map._id) === String(override.seatMap));
      if (target) {
        addWarning({
          code: "override_seat_map_mismatch",
          field: "eventSeatOverride",
          message: "Izuzetak referencira sedište van mape termina.",
        }, "seatMap", target);
      }
    }
  }
  for (const event of events.filter((item) =>
    item.status === "scheduled"
    && item.saleStatus === "on_sale"
    && item.ticketing?.enabled
    && item.ticketing?.provider === "internal"
    && item.seatMap
  )) {
    const effective = await calculateEffectiveSeatStates(event);
    if (!effective.counts.available) {
      addWarning({
        code: "no_publicly_available_seats",
        field: "seatMap",
        message: "Online termin nema nijedno javno dostupno sedište.",
      }, "event", event);
    }
  }

  const eventsOnSale = events.filter((event) => event.saleStatus === "on_sale").length;
  const eventsMissingSeatMap = events.filter((event) => event.saleStatus === "on_sale" && !event.seatMap).length;
  const eventsMissingPricePlan = events.filter((event) => event.saleStatus === "on_sale" && !event.pricePlan).length;

  res.json({
    success: true,
    status: warningItems.some((item) => item.targetType === "event") ? "warning" : "ok",
    counts: {
      productions: productionsCount,
      artists: artistsCount,
      events: events.length,
      venues: venuesCount,
      seatMaps: seatMaps.length,
      seats: seatsCount,
      priceCategories: priceCategoriesCount,
      pricePlans: pricePlans.length,
      customers: customersCount,
      orders: ordersCount,
      orderItems: orderItemsCount,
      activeLocks: activeLocksCount,
      eventSeatOverrides: overrides.length,
    },
    warnings: {
      eventsOnSale,
      eventsMissingSeatMap,
      eventsMissingPricePlan,
      ...warningCounts,
    },
    warningItems,
  });
});

module.exports = { getAdminSystemStatus };
