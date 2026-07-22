const EVENT_STATUSES = [
  "draft",
  "scheduled",
  "completed",
  "cancelled",
  "postponed",
  "archived",
];

const LEGACY_EVENT_STATUS_MAP = {
  finished: "completed",
};

const SALE_STATUSES = [
  "not_started",
  "on_sale",
  "sold_out",
  "closed",
  "free",
];

const LEGACY_SALE_STATUS_MAP = {
  not_on_sale: "not_started",
  sales_closed: "closed",
};

const TICKETING_PROVIDERS = ["internal", "legacy_php", "external", "manual"];
const PRICE_PLAN_STATUSES = ["draft", "active", "inactive", "archived"];
const SUPPORTED_CURRENCIES = ["RSD", "EUR"];

const normalizeEventStatus = (value) => LEGACY_EVENT_STATUS_MAP[value] || value;
const normalizeSaleStatus = (value) => LEGACY_SALE_STATUS_MAP[value] || value;

module.exports = {
  EVENT_STATUSES,
  LEGACY_EVENT_STATUS_MAP,
  LEGACY_SALE_STATUS_MAP,
  PRICE_PLAN_STATUSES,
  SALE_STATUSES,
  SUPPORTED_CURRENCIES,
  TICKETING_PROVIDERS,
  normalizeEventStatus,
  normalizeSaleStatus,
};
