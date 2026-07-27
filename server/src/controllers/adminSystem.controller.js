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
const CostumeItem = require("../models/CostumeItem");
const PropScenographyItem = require("../models/PropScenographyItem");
const RentalSpace = require("../models/RentalSpace");
const RentalInquiry = require("../models/RentalInquiry");
const EventPlanningInquiry = require("../models/EventPlanningInquiry");
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
    orders,
    orderItemsCount,
    activeLocksCount,
    overrides,
    costumeItemsCount,
    propScenographyItemsCount,
    rentalSpacesCount,
    rentalInquiries,
    eventPlanningInquiries,
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
    Order.find()
      .select("orderCode status emailDelivery eventSnapshot reservationExpiresAt paymentExpiresAt expiresAt items")
      .populate("event", "startsAt production venue"),
    OrderItem.countDocuments(),
    SeatLock.countDocuments({ status: "active", expiresAt: { $gt: now } }),
    EventSeatOverride.find()
      .populate("event", "seatMap venue startsAt status saleStatus")
      .populate("seat", "seatMap label"),
    CostumeItem.countDocuments(),
    PropScenographyItem.countDocuments(),
    RentalSpace.countDocuments(),
    RentalInquiry.find().select("referenceNumber status emailDelivery desiredDate createdAt"),
    EventPlanningInquiry.find().select("referenceNumber status emailDelivery desiredDate createdAt"),
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
      targetLabel: targetType === "order"
        ? target.orderCode
        : targetType === "rentalInquiry" || targetType === "eventPlanningInquiry"
        ? target.referenceNumber
        : targetType === "event"
        ? `${target.production?.title || "Termin"} - ${new Date(target.startsAt).toLocaleString("sr-RS")}`
        : target.name,
      link: targetType === "order"
        ? `/admin/orders/${target._id}`
        : targetType === "rentalInquiry"
        ? `/admin/rental-inquiries/${target._id}`
        : targetType === "eventPlanningInquiry"
        ? `/admin/event-planning-inquiries/${target._id}`
        : targetType === "event"
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

  for (const order of orders) {
    if (order.emailDelivery?.status === "failed") {
      addWarning({
        code: "order_confirmation_email_failed",
        field: "emailDelivery",
        message: "Potvrda porudzbine nije poslata. Proverite konfiguraciju i posaljite ponovo.",
      }, "order", order);
    }
    const expiry = order.status === "reserved"
      ? order.reservationExpiresAt || order.expiresAt
      : order.paymentExpiresAt || order.expiresAt;
    if (["reserved", "pending_payment"].includes(order.status) && expiry && expiry <= now) {
      addWarning({
        code: "active_order_past_expiry",
        field: "expiresAt",
        message: "Aktivna rezervacija ili kupovina je prosla rok isteka.",
      }, "order", order);
    }
    if (!order.eventSnapshot?.productionTitle || !order.eventSnapshot?.eventStartsAt) {
      addWarning({
        code: "missing_order_snapshot",
        field: "eventSnapshot",
        message: "Porudzbini nedostaje istorijski snapshot dogadjaja.",
      }, "order", order);
    }
  }

  for (const inquiry of rentalInquiries) {
    if (inquiry.emailDelivery?.status === "failed" || inquiry.emailDelivery?.status === "not_configured") {
      addWarning({
        code: "rental_inquiry_email_failed",
        field: "emailDelivery",
        message: "Obavestenje za upit o zakupu prostora nije poslato.",
      }, "rentalInquiry", inquiry);
    }
  }
  for (const inquiry of eventPlanningInquiries) {
    if (inquiry.emailDelivery?.status === "failed" || inquiry.emailDelivery?.status === "not_configured") {
      addWarning({
        code: "event_planning_inquiry_email_failed",
        field: "emailDelivery",
        message: "Obavestenje za event planning upit nije poslato.",
      }, "eventPlanningInquiry", inquiry);
    }
  }

  const activeOrderIds = orders
    .filter((order) => ["reserved", "pending_payment", "paid"].includes(order.status))
    .map((order) => order._id);
  const duplicateActiveSeats = activeOrderIds.length
    ? await OrderItem.aggregate([
        {
          $match: {
            order: { $in: activeOrderIds },
            status: { $in: ["reserved", "pending_payment", "paid"] },
          },
        },
        {
          $group: {
            _id: { event: "$event", seat: "$seat" },
            count: { $sum: 1 },
            orders: { $addToSet: "$order" },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
    : [];
  for (const duplicate of duplicateActiveSeats) {
    const target = orders.find((order) =>
      duplicate.orders.some((orderId) => String(orderId) === String(order._id))
    );
    if (target) {
      addWarning({
        code: "duplicate_active_order_seat",
        field: "items",
        message: "Isto sediste postoji u vise aktivnih porudzbina.",
      }, "order", target);
    }
  }

  const eventsOnSale = events.filter((event) => event.saleStatus === "on_sale").length;
  const eventsMissingSeatMap = events.filter((event) => event.saleStatus === "on_sale" && !event.seatMap).length;
  const eventsMissingPricePlan = events.filter((event) => event.saleStatus === "on_sale" && !event.pricePlan).length;

  res.json({
    success: true,
    status: warningItems.length ? "warning" : "ok",
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
      orders: orders.length,
      orderItems: orderItemsCount,
      activeLocks: activeLocksCount,
      eventSeatOverrides: overrides.length,
      costumeItems: costumeItemsCount,
      propScenographyItems: propScenographyItemsCount,
      rentalSpaces: rentalSpacesCount,
      rentalInquiries: rentalInquiries.length,
      eventPlanningInquiries: eventPlanningInquiries.length,
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
