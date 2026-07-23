const EVENT_SEAT_OVERRIDE_TYPES = [
  "blocked",
  "protocol",
  "vip",
  "guest",
  "production_use",
  "box_office_only",
  "temporarily_unavailable",
];

const EFFECTIVE_SEAT_STATES = [
  "available",
  "unavailable",
  "locked",
  "reserved",
  "sold",
  "box_office_only",
];

const SEAT_MAP_STATUSES = ["draft", "active", "archived"];

const EVENT_SEAT_OVERRIDE_LABELS = {
  blocked: "Blokirano",
  protocol: "Protokol",
  vip: "VIP",
  guest: "Gosti",
  production_use: "Potrebe produkcije",
  box_office_only: "Samo blagajna",
  temporarily_unavailable: "Privremeno nedostupno",
};

module.exports = {
  EFFECTIVE_SEAT_STATES,
  EVENT_SEAT_OVERRIDE_LABELS,
  EVENT_SEAT_OVERRIDE_TYPES,
  SEAT_MAP_STATUSES,
};
