const {
  EMAIL_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
} = require("../constants/order.constants");
const { getOrderExpiry } = require("./orderLifecycle.service");

const idOf = (value) => String(value?._id || value?.id || value || "");
const titleOf = (production) => production?.title || "";
const venueNameOf = (venue) => venue?.name || "";

const itemDto = (item) => ({
  id: idOf(item),
  seatId: idOf(item.seat),
  seatLabel: item.seatLabel || item.seat?.label || "",
  section: item.section || item.seat?.section || "",
  row: item.row || item.seat?.row || "",
  number: item.number ?? item.seat?.number ?? null,
  priceCategoryCode: item.priceCategoryCode || item.priceCategory?.code || "",
  priceCategoryName: item.priceCategoryName || item.priceCategory?.name || "",
  unitPrice: item.unitPrice,
  finalPrice: item.finalPrice,
  currency: item.currency,
  status: item.status,
});

const eventDto = (order) => {
  const event = order.event || {};
  const snapshot = order.eventSnapshot || {};
  return {
    id: idOf(event),
    productionId: idOf(event.production || snapshot.productionId),
    productionTitle: titleOf(event.production) || snapshot.productionTitle || "",
    startsAt: event.startsAt || snapshot.eventStartsAt || null,
    endsAt: event.endsAt || snapshot.eventEndsAt || null,
    venueId: idOf(event.venue || snapshot.venueId),
    venueName: venueNameOf(event.venue) || snapshot.venueName || "",
    venueStage: snapshot.venueStage || "",
  };
};

const publicOrderDto = (order) => ({
  reference: order.orderCode,
  orderType: order.orderType,
  orderTypeLabel: ORDER_TYPE_LABELS[order.orderType] || order.orderType,
  status: order.status,
  statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
  paymentStatus: order.paymentStatus,
  paymentStatusLabel: PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus,
  event: eventDto(order),
  customer: {
    firstName: order.customerSnapshot?.firstName || "",
    lastName: order.customerSnapshot?.lastName || "",
    fullName: order.customerSnapshot?.fullName || "",
    email: order.customerSnapshot?.email || "",
    phone: order.customerSnapshot?.phone || "",
  },
  items: (order.items || []).map(itemDto),
  subtotalAmount: order.subtotalAmount,
  discountAmount: order.discountAmount,
  totalAmount: order.totalAmount,
  currency: order.currency,
  expiresAt: getOrderExpiry(order),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const adminOrderDto = (order, { includeHistory = false } = {}) => {
  const dto = {
    id: idOf(order),
    ...publicOrderDto(order),
    emailDelivery: {
      status: order.emailDelivery?.status || "pending",
      statusLabel:
        EMAIL_STATUS_LABELS[order.emailDelivery?.status || "pending"] ||
        order.emailDelivery?.status ||
        "pending",
      messageType: order.emailDelivery?.messageType || "",
      sentAt: order.emailDelivery?.sentAt || null,
      lastAttemptAt: order.emailDelivery?.lastAttemptAt || null,
      lastError: order.emailDelivery?.lastError || "",
      resendCount: order.emailDelivery?.resendCount || 0,
      lastResendAt: order.emailDelivery?.lastResendAt || null,
    },
    paidAt: order.paidAt || null,
    cancelledAt: order.cancelledAt || null,
    expiredAt: order.expiredAt || null,
    notes: order.notes || "",
  };
  if (includeHistory) {
    dto.statusHistory = (order.statusHistory || []).map((entry) => ({
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      reason: entry.reason,
      source: entry.source,
      changedAt: entry.changedAt,
      changedBy: entry.changedBy
        ? {
            id: idOf(entry.changedBy),
            username: entry.changedBy.username || "",
            email: entry.changedBy.email || "",
          }
        : null,
    }));
  }
  return dto;
};

module.exports = {
  adminOrderDto,
  eventDto,
  itemDto,
  publicOrderDto,
};
