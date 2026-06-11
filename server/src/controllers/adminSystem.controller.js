const asyncHandler = require("../utils/asyncHandler");

const Production = require("../models/Production");
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

const getAdminSystemStatus = asyncHandler(async (req, res) => {
  const now = new Date();

  const [
    productionsCount,
    eventsCount,
    venuesCount,
    seatMapsCount,
    seatsCount,
    priceCategoriesCount,
    pricePlansCount,
    customersCount,
    ordersCount,
    orderItemsCount,
    activeLocksCount,
    eventsMissingSeatMap,
    eventsMissingPricePlan,
    eventsOnSale,
  ] = await Promise.all([
    Production.countDocuments(),
    Event.countDocuments(),
    Venue.countDocuments(),
    SeatMap.countDocuments(),
    Seat.countDocuments(),
    PriceCategory.countDocuments(),
    PricePlan.countDocuments(),
    Customer.countDocuments(),
    Order.countDocuments(),
    OrderItem.countDocuments(),
    SeatLock.countDocuments({
      status: "active",
      expiresAt: { $gt: now },
    }),
    Event.countDocuments({
      saleStatus: "on_sale",
      $or: [{ seatMap: null }, { seatMap: { $exists: false } }],
    }),
    Event.countDocuments({
      saleStatus: "on_sale",
      $or: [{ pricePlan: null }, { pricePlan: { $exists: false } }],
    }),
    Event.countDocuments({
      saleStatus: "on_sale",
    }),
  ]);

  res.json({
    success: true,
    status: "ok",
    counts: {
      productions: productionsCount,
      events: eventsCount,
      venues: venuesCount,
      seatMaps: seatMapsCount,
      seats: seatsCount,
      priceCategories: priceCategoriesCount,
      pricePlans: pricePlansCount,
      customers: customersCount,
      orders: ordersCount,
      orderItems: orderItemsCount,
      activeLocks: activeLocksCount,
    },
    warnings: {
      eventsOnSale,
      eventsMissingSeatMap,
      eventsMissingPricePlan,
    },
  });
});

module.exports = {
  getAdminSystemStatus,
};