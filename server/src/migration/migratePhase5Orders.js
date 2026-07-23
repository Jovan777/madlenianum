require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
require("../models/Event");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
require("../models/Production");
require("../models/Venue");

const migrate = async () => {
  await connectDB();
  const orders = await Order.find()
    .select("+sessionId +idempotencyKey +publicAccessTokenHash")
    .populate({ path: "event", populate: [{ path: "production" }, { path: "venue" }] });
  let migratedOrders = 0;
  let migratedItems = 0;

  for (const order of orders) {
    let changed = false;
    if (!order.orderType) {
      order.orderType = ["pending_payment"].includes(order.status)
        || order.paymentStatus === "pending"
        ? "purchase"
        : "reservation";
      changed = true;
    }
    if (order.status === "pending" && order.paymentStatus === "pending") {
      order.status = "pending_payment";
      order.orderType = "purchase";
      changed = true;
    }
    if (order.status === "reserved" && !order.reservationExpiresAt && order.expiresAt) {
      order.reservationExpiresAt = order.expiresAt;
      changed = true;
    }
    if (
      ["pending", "pending_payment"].includes(order.status)
      && !order.paymentExpiresAt
      && order.expiresAt
    ) {
      order.paymentExpiresAt = order.expiresAt;
      changed = true;
    }
    if (!order.eventSnapshot?.productionTitle && order.event) {
      order.eventSnapshot = {
        productionId: order.event.production?._id,
        productionTitle: order.event.production?.title || "",
        eventStartsAt: order.event.startsAt,
        eventEndsAt: order.event.endsAt,
        venueId: order.event.venue?._id,
        venueName: order.event.venue?.name || "",
        venueStage: order.event.venue?.name || "",
      };
      changed = true;
    }
    if (!order.statusHistory?.length) {
      order.statusHistory = [{
        fromStatus: "",
        toStatus: order.status,
        reason: "Postojeci zapis evidentiran Phase 5 migracijom.",
        source: "migration",
        changedAt: order.createdAt || new Date(),
      }];
      changed = true;
    }
    if (!order.emailDelivery?.status) {
      const messageType = order.status === "reserved"
        ? "reservation"
        : ["pending_payment", "paid", "cancelled", "expired"].includes(order.status)
          ? order.status
          : "reservation";
      order.emailDelivery = {
        status: "not_configured",
        messageType,
      };
      changed = true;
    }
    if (changed) {
      await order.save();
      migratedOrders += 1;
    }

    const itemChanges = {
      production: order.eventSnapshot?.productionId,
      productionTitle: order.eventSnapshot?.productionTitle || "",
      eventStartsAt: order.eventSnapshot?.eventStartsAt,
      venueName: order.eventSnapshot?.venueName || "",
    };
    const result = await OrderItem.updateMany(
      {
        order: order._id,
        $or: [
          { productionTitle: { $exists: false } },
          { productionTitle: "" },
          { eventStartsAt: { $exists: false } },
        ],
      },
      { $set: itemChanges }
    );
    migratedItems += result.modifiedCount;
  }

  console.log(JSON.stringify({
    success: true,
    scannedOrders: orders.length,
    migratedOrders,
    migratedItems,
  }, null, 2));
};

migrate()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Phase 5 order migration failed:", error);
    if (mongoose.connection.readyState) await mongoose.disconnect();
    process.exit(1);
  });
