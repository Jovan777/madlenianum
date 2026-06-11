const asyncHandler = require("../utils/asyncHandler");

const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");

const getOrders = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.event) filter.event = req.query.event;
  if (req.query.customer) filter.customer = req.query.customer;

  if (req.query.q) {
    filter.$or = [
      { orderCode: new RegExp(req.query.q, "i") },
      { "customerSnapshot.fullName": new RegExp(req.query.q, "i") },
      { "customerSnapshot.email": new RegExp(req.query.q, "i") },
    ];
  }

  const items = await Order.find(filter)
    .populate("customer")
    .populate({
      path: "event",
      populate: [
        { path: "production" },
        { path: "venue" },
      ],
    })
    .populate("items")
    .sort("-createdAt");

  res.json({
    success: true,
    items,
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const item = await Order.findById(req.params.id)
    .populate("customer")
    .populate({
      path: "event",
      populate: [
        { path: "production" },
        { path: "venue" },
      ],
    })
    .populate({
      path: "items",
      populate: [{ path: "seat" }, { path: "priceCategory" }],
    });

  if (!item) {
    res.status(404);
    throw new Error("Order not found.");
  }

  res.json({
    success: true,
    item,
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus, notes } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (status !== undefined) {
    order.status = status;
  }

  if (paymentStatus !== undefined) {
    order.paymentStatus = paymentStatus;
  }

  if (notes !== undefined) {
    order.notes = notes;
  }

  if (status === "paid") {
    order.paymentStatus = "paid";
    order.paidAt = new Date();

    await OrderItem.updateMany(
      { order: order._id },
      { $set: { status: "paid" } }
    );
  }

  if (["cancelled", "expired"].includes(status)) {
    order.paymentStatus = "cancelled";
    order.cancelledAt = new Date();

    await OrderItem.updateMany(
      {
        order: order._id,
        status: { $in: ["pending", "reserved"] },
      },
      {
        $set: { status: "cancelled" },
      }
    );
  }

  if (status === "refunded") {
    order.paymentStatus = "refunded";

    await OrderItem.updateMany(
      { order: order._id },
      { $set: { status: "refunded" } }
    );
  }

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate("customer")
    .populate({
      path: "event",
      populate: [
        { path: "production" },
        { path: "venue" },
      ],
    })
    .populate({
      path: "items",
      populate: [{ path: "seat" }, { path: "priceCategory" }],
    });

  res.json({
    success: true,
    item: updatedOrder,
  });
});

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus,
};