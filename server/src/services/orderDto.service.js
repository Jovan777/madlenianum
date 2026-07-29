const {
  EMAIL_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
} = require("../constants/order.constants");
const { getOrderExpiry } = require("./orderLifecycle.service");
const { localizedValue, normalizeLocale } = require("./locale.service");

const EN_ORDER_TYPE_LABELS = { reservation: "Reservation", purchase: "Purchase" };
const EN_ORDER_STATUS_LABELS = { pending: "Processing", reserved: "Reserved", pending_payment: "Payment pending", paid: "Paid", expired: "Expired", cancelled: "Cancelled", refunded: "Refunded" };
const EN_PAYMENT_STATUS_LABELS = { unpaid: "Unpaid", pending: "Payment pending", paid: "Paid", failed: "Failed", cancelled: "Cancelled", refunded: "Refunded" };

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
  const locale = normalizeLocale(order.locale);
  return {
    id: idOf(event),
    productionId: idOf(event.production || snapshot.productionId),
    productionTitle: localizedValue(event.production, "title", locale) || snapshot.productionTitle || titleOf(event.production),
    startsAt: event.startsAt || snapshot.eventStartsAt || null,
    endsAt: event.endsAt || snapshot.eventEndsAt || null,
    venueId: idOf(event.venue || snapshot.venueId),
    venueName: localizedValue(event.venue, "name", locale) || snapshot.venueName || venueNameOf(event.venue),
    venueStage: snapshot.venueStage || "",
  };
};

const publicOrderDto = (order) => ({
  locale: normalizeLocale(order.locale),
  reference: order.orderCode,
  orderType: order.orderType,
  orderTypeLabel: normalizeLocale(order.locale) === "en" ? EN_ORDER_TYPE_LABELS[order.orderType] || order.orderType : ORDER_TYPE_LABELS[order.orderType] || order.orderType,
  status: order.status,
  statusLabel: normalizeLocale(order.locale) === "en" ? EN_ORDER_STATUS_LABELS[order.status] || order.status : ORDER_STATUS_LABELS[order.status] || order.status,
  paymentStatus: order.paymentStatus,
  paymentStatusLabel: normalizeLocale(order.locale) === "en" ? EN_PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus : PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus,
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
