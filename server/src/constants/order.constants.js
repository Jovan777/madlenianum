const ORDER_TYPES = ["reservation", "purchase"];

const ORDER_STATUSES = [
  "pending",
  "reserved",
  "pending_payment",
  "paid",
  "expired",
  "cancelled",
  "refunded",
];

const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
];

const ACTIVE_ORDER_STATUSES = ["reserved", "pending_payment"];
const TERMINAL_ORDER_STATUSES = ["paid", "expired", "cancelled", "refunded"];
const EMAIL_STATUSES = ["pending", "sent", "failed", "not_configured"];

const ORDER_STATUS_LABELS = {
  pending: "U obradi",
  reserved: "Rezervisano",
  pending_payment: "Kupovina u toku",
  paid: "Plaćeno",
  expired: "Isteklo",
  cancelled: "Otkazano",
  refunded: "Refundirano",
};

const PAYMENT_STATUS_LABELS = {
  unpaid: "Nije plaćeno",
  pending: "Čeka plaćanje",
  paid: "Plaćeno",
  failed: "Neuspešno",
  cancelled: "Otkazano",
  refunded: "Refundirano",
};

const EMAIL_STATUS_LABELS = {
  pending: "Čeka slanje",
  sent: "Poslato",
  failed: "Neuspešno",
  not_configured: "Email nije konfigurisan",
};

const ORDER_TYPE_LABELS = {
  reservation: "Rezervacija",
  purchase: "Kupovina",
};

module.exports = {
  ACTIVE_ORDER_STATUSES,
  EMAIL_STATUSES,
  EMAIL_STATUS_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_TYPES,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  TERMINAL_ORDER_STATUSES,
};
