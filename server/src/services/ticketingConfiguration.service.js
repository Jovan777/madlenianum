const mongoose = require("mongoose");

const Event = require("../models/Event");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const PriceCategory = require("../models/PriceCategory");
const PricePlan = require("../models/PricePlan");
const Production = require("../models/Production");
const Seat = require("../models/Seat");
const SeatLock = require("../models/SeatLock");
const SeatMap = require("../models/SeatMap");
const Venue = require("../models/Venue");
const {
  EVENT_STATUSES,
  PRICE_PLAN_STATUSES,
  SALE_STATUSES,
  SUPPORTED_CURRENCIES,
  TICKETING_PROVIDERS,
  normalizeEventStatus,
  normalizeSaleStatus,
} = require("../constants/ticketing.constants");

const PRODUCTION_TYPES = [
  "opera",
  "opereta",
  "balet",
  "drama",
  "mjuzikl",
  "koncert",
  "gostujuca_predstava",
  "ostalo",
];

const idOf = (value) => {
  if (!value) return "";
  return String(value._id || value.id || value);
};

const issue = (field, code, message, meta) => ({
  field,
  code,
  message,
  ...(meta ? { meta } : {}),
});

const validationError = (message, errors, warnings = []) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.details = { fields: errors, warnings };
  return error;
};

const conflictError = (message, details) => {
  const error = new Error(message);
  error.statusCode = 409;
  error.details = details;
  return error;
};

const validObjectId = (value) => Boolean(value && mongoose.Types.ObjectId.isValid(idOf(value)));

const parseDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? false : date;
};

const httpUrlIsValid = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const sameId = (left, right) => idOf(left) === idOf(right);
const sameDate = (left, right) => {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return leftTime === rightTime;
};

const effectiveEventPayload = (payload = {}, existingEvent = null) => {
  const existing = existingEvent?.toObject ? existingEvent.toObject() : (existingEvent || {});
  const ticketing = {
    ...(existing.ticketing || {}),
    ...(payload.ticketing || {}),
  };

  return {
    ...existing,
    ...payload,
    status: normalizeEventStatus(payload.status ?? existing.status ?? "draft"),
    saleStatus: normalizeSaleStatus(payload.saleStatus ?? existing.saleStatus ?? "not_started"),
    ticketing,
  };
};

const normalizeEventPayload = (payload = {}, existingEvent = null) => {
  const effective = effectiveEventPayload(payload, existingEvent);
  const normalized = {};
  const directFields = [
    "production",
    "venue",
    "startsAt",
    "endsAt",
    "isPremiere",
    "badge",
    "status",
    "saleStatus",
    "seatMap",
    "pricePlan",
    "saleStartsAt",
    "saleEndsAt",
    "maxTicketsPerOrder",
    "lockDurationMinutes",
    "basePrice",
    "notes",
    "translations",
  ];

  directFields.forEach((field) => {
    if (payload[field] !== undefined) normalized[field] = payload[field];
  });

  if (payload.status !== undefined) normalized.status = normalizeEventStatus(payload.status);
  if (payload.saleStatus !== undefined) normalized.saleStatus = normalizeSaleStatus(payload.saleStatus);

  ["startsAt", "endsAt", "saleStartsAt", "saleEndsAt"].forEach((field) => {
    if (payload[field] !== undefined) normalized[field] = parseDate(payload[field]);
  });

  if (payload.maxTicketsPerOrder !== undefined) {
    normalized.maxTicketsPerOrder = Number(payload.maxTicketsPerOrder);
  }
  if (payload.lockDurationMinutes !== undefined) {
    normalized.lockDurationMinutes = Number(payload.lockDurationMinutes);
  }

  if (payload.ticketing !== undefined) {
    const provider = payload.ticketing.provider || effective.ticketing.provider || "manual";
    normalized.ticketing = {
      enabled: provider === "manual" ? false : Boolean(payload.ticketing.enabled),
      provider,
      legacyEventId: provider === "legacy_php"
        ? String(payload.ticketing.legacyEventId || "").trim()
        : "",
      externalCheckoutUrl: provider === "external"
        ? String(payload.ticketing.externalCheckoutUrl || "").trim()
        : "",
      note: String(payload.ticketing.note || "").trim(),
    };
  }

  return normalized;
};

const loadReference = async (Model, value, field, errors, populate = null) => {
  if (!value) return null;
  if (!validObjectId(value)) {
    errors.push(issue(field, "invalid_object_id", `${field} nije ispravan ID.`));
    return null;
  }
  let query = Model.findById(idOf(value));
  if (populate) query = query.populate(populate);
  const item = await query;
  if (!item) errors.push(issue(field, "not_found", `Izabrani ${field} ne postoji.`));
  return item;
};

const validateEventConfiguration = async (payload = {}, options = {}) => {
  const existingEvent = options.existingEvent || null;
  const effective = effectiveEventPayload(payload, existingEvent);
  const errors = [];
  const warnings = [];

  if (!effective.production) errors.push(issue("production", "required", "Predstava je obavezna."));
  if (!effective.venue) errors.push(issue("venue", "required", "Scena je obavezna."));
  if (!effective.startsAt) errors.push(issue("startsAt", "required", "Početak termina je obavezan."));

  if (!EVENT_STATUSES.includes(effective.status)) {
    errors.push(issue("status", "invalid_status", "Status termina nije podržan."));
  }
  if (!SALE_STATUSES.includes(effective.saleStatus)) {
    errors.push(issue("saleStatus", "invalid_status", "Status prodaje nije podržan."));
  }

  const provider = effective.ticketing?.provider || "manual";
  if (!TICKETING_PROVIDERS.includes(provider)) {
    errors.push(issue("ticketing.provider", "invalid_provider", "Način prodaje nije podržan."));
  }

  const startsAt = parseDate(effective.startsAt);
  const endsAt = parseDate(effective.endsAt);
  const saleStartsAt = parseDate(effective.saleStartsAt);
  const saleEndsAt = parseDate(effective.saleEndsAt);

  if (startsAt === false) errors.push(issue("startsAt", "invalid_date", "Početak termina nije ispravan datum."));
  if (endsAt === false) errors.push(issue("endsAt", "invalid_date", "Kraj termina nije ispravan datum."));
  if (saleStartsAt === false) errors.push(issue("saleStartsAt", "invalid_date", "Početak prodaje nije ispravan datum."));
  if (saleEndsAt === false) errors.push(issue("saleEndsAt", "invalid_date", "Kraj prodaje nije ispravan datum."));

  if (startsAt && endsAt && endsAt <= startsAt) {
    errors.push(issue("endsAt", "invalid_range", "Kraj termina mora biti posle početka."));
  }
  if (saleStartsAt && saleEndsAt && saleEndsAt <= saleStartsAt) {
    errors.push(issue("saleEndsAt", "invalid_range", "Kraj prodaje mora biti posle početka prodaje."));
  }
  if (startsAt && saleEndsAt && saleEndsAt > startsAt) {
    errors.push(issue("saleEndsAt", "after_event_start", "Prodaja ne može da traje posle početka termina."));
  }

  const maxTickets = Number(effective.maxTicketsPerOrder ?? 4);
  if (!Number.isInteger(maxTickets) || maxTickets < 1 || maxTickets > 20) {
    errors.push(issue("maxTicketsPerOrder", "invalid_limit", "Broj ulaznica po porudžbini mora biti ceo broj od 1 do 20."));
  }
  const lockDuration = Number(effective.lockDurationMinutes ?? 15);
  if (!Number.isInteger(lockDuration) || lockDuration < 1 || lockDuration > 60) {
    errors.push(issue("lockDurationMinutes", "invalid_limit", "Trajanje rezervacije mora biti ceo broj od 1 do 60 minuta."));
  }

  const [production, venue, seatMap, pricePlan] = await Promise.all([
    loadReference(Production, effective.production, "production", errors),
    loadReference(Venue, effective.venue, "venue", errors),
    loadReference(SeatMap, effective.seatMap, "seatMap", errors),
    loadReference(PricePlan, effective.pricePlan, "pricePlan", errors, "rules.priceCategory"),
  ]);

  if (seatMap && venue && !sameId(seatMap.venue, venue)) {
    errors.push(issue("seatMap", "venue_mismatch", "Mapa sedišta ne pripada izabranoj sceni."));
  }
  if (pricePlan && venue && !pricePlan.venue) {
    errors.push(issue("pricePlan", "venue_missing", "Cenovnik nema definisanu scenu."));
  } else if (pricePlan && venue && !sameId(pricePlan.venue, venue)) {
    errors.push(issue("pricePlan", "venue_mismatch", "Cenovnik ne pripada izabranoj sceni."));
  }

  if (pricePlan && startsAt) {
    if (pricePlan.validFrom && startsAt < new Date(pricePlan.validFrom)) {
      errors.push(issue("pricePlan", "not_yet_valid", "Cenovnik još ne važi na datum termina."));
    }
    if (pricePlan.validTo && startsAt > new Date(pricePlan.validTo)) {
      errors.push(issue("pricePlan", "expired", "Cenovnik više ne važi na datum termina."));
    }
  }

  if (pricePlan && production && pricePlan.productionTypes?.length
      && !pricePlan.productionTypes.includes(production.type)) {
    errors.push(issue("pricePlan", "unsupported_production_type", "Cenovnik ne podržava tip izabrane predstave."));
  }
  if (pricePlan && Boolean(pricePlan.isPremiere) !== Boolean(effective.isPremiere)) {
    errors.push(issue("pricePlan", "premiere_mismatch", "Premijerni status termina i cenovnika se ne podudaraju."));
  }

  const needsInternalAllocation = effective.ticketing?.enabled && provider === "internal";
  if (needsInternalAllocation && !seatMap) {
    errors.push(issue("seatMap", "required_for_internal", "Interna prodaja zahteva mapu sedišta."));
  }
  if (needsInternalAllocation && effective.saleStatus !== "free" && !pricePlan) {
    errors.push(issue("pricePlan", "required_for_internal", "Interna prodaja zahteva cenovnik."));
  }
  if (provider === "legacy_php" && effective.ticketing?.enabled
      && !String(effective.ticketing?.legacyEventId || "").trim()) {
    errors.push(issue("ticketing.legacyEventId", "required_for_legacy", "Postojeći PHP sistem zahteva ID događaja."));
  }
  if (provider === "external" && effective.ticketing?.enabled) {
    const url = String(effective.ticketing?.externalCheckoutUrl || "").trim();
    if (!url) {
      errors.push(issue("ticketing.externalCheckoutUrl", "required_for_external", "Spoljni sistem zahteva URL za kupovinu."));
    } else if (!httpUrlIsValid(url)) {
      errors.push(issue("ticketing.externalCheckoutUrl", "invalid_url", "URL za kupovinu mora koristiti HTTP ili HTTPS."));
    }
  }

  if (["cancelled", "completed", "archived"].includes(effective.status)
      && effective.saleStatus === "on_sale") {
    errors.push(issue("saleStatus", "invalid_lifecycle", "Otkazan, završen ili arhiviran termin ne može biti u prodaji."));
  }
  if (effective.status === "postponed" && effective.saleStatus === "on_sale") {
    errors.push(issue("saleStatus", "postponed_on_sale", "Odložen termin mora zatvoriti prodaju dok se ne potvrdi novi datum."));
  }
  if (effective.status === "draft" && effective.saleStatus === "on_sale") {
    errors.push(issue("saleStatus", "draft_on_sale", "Termin u nacrtu ne može biti u prodaji."));
  }

  if (effective.saleStatus === "on_sale" && !saleStartsAt) {
    warnings.push(issue("saleStartsAt", "missing_sale_start", "Termin je u prodaji bez definisanog početka prodaje."));
  }
  if (effective.saleStatus === "on_sale" && !saleEndsAt) {
    warnings.push(issue("saleEndsAt", "missing_sale_end", "Termin je u prodaji bez definisanog kraja prodaje."));
  }
  if (effective.saleStatus === "on_sale" && !effective.ticketing?.enabled) {
    warnings.push(issue("ticketing.enabled", "online_ticketing_disabled", "Prodaja je otvorena, ali online ticketing nije omogućen."));
  }
  if (effective.status === "scheduled" && startsAt && startsAt < new Date()) {
    warnings.push(issue("status", "scheduled_in_past", "Početak termina je prošao, a status je i dalje Zakazano."));
  }
  if (startsAt && startsAt < new Date() && effective.saleStatus === "on_sale") {
    warnings.push(issue("saleStatus", "sale_open_after_start", "Prodaja je ostala otvorena nakon početka termina."));
  }

  if (pricePlan) {
    if (pricePlan.status !== "active") {
      const target = effective.status === "scheduled" && needsInternalAllocation ? errors : warnings;
      target.push(issue("pricePlan", "inactive_plan", "Izabrani cenovnik nije aktivan."));
    }
    const inactiveRule = pricePlan.rules?.find((rule) => rule.priceCategory && rule.priceCategory.status !== "active");
    if (inactiveRule) {
      warnings.push(issue("pricePlan", "inactive_category", "Cenovnik koristi neaktivnu cenovnu kategoriju."));
    }
  }

  if (seatMap && pricePlan && effective.saleStatus !== "free") {
    const requiredCategoryIds = await Seat.distinct("priceCategory", {
      seatMap: seatMap._id,
      isActive: true,
      isSellable: true,
      priceCategory: { $ne: null },
    });
    const hasAllRule = pricePlan.rules?.some((rule) => rule.priceCategory?.code === "ALL");
    const configuredIds = new Set((pricePlan.rules || []).map((rule) => idOf(rule.priceCategory)));
    const missingIds = requiredCategoryIds.filter((id) => !configuredIds.has(String(id)));
    if (!hasAllRule && missingIds.length) {
      errors.push(issue("pricePlan", "missing_seat_categories", "Cenovnik nema cenu za sve kategorije sedišta na izabranoj mapi.", {
        missingCategoryIds: missingIds.map(String),
      }));
    }
  }

  return { errors, warnings, effective, references: { production, venue, seatMap, pricePlan } };
};

const normalizePricePlanPayload = (payload = {}) => {
  const normalized = {};
  const fields = [
    "name",
    "venue",
    "productionTypes",
    "isPremiere",
    "currency",
    "rules",
    "validFrom",
    "validTo",
    "notes",
    "status",
    "revision",
    "parentPlan",
  ];
  fields.forEach((field) => {
    if (payload[field] !== undefined) normalized[field] = payload[field];
  });
  if (payload.name !== undefined) normalized.name = String(payload.name || "").trim();
  if (payload.currency !== undefined) normalized.currency = String(payload.currency || "RSD").trim().toUpperCase();
  if (payload.status !== undefined) normalized.status = String(payload.status);
  if (payload.validFrom !== undefined) normalized.validFrom = parseDate(payload.validFrom);
  if (payload.validTo !== undefined) normalized.validTo = parseDate(payload.validTo);
  if (payload.productionTypes !== undefined) normalized.productionTypes = [...new Set(payload.productionTypes || [])];
  if (payload.rules !== undefined) {
    normalized.rules = (payload.rules || []).map((rule) => ({
      priceCategory: rule.priceCategory,
      amount: Number(rule.amount),
      label: String(rule.label || "").trim(),
    }));
  }
  return normalized;
};

const rangesOverlap = (leftFrom, leftTo, rightFrom, rightTo) => {
  const min = new Date(-8640000000000000);
  const max = new Date(8640000000000000);
  return (leftFrom || min) <= (rightTo || max) && (rightFrom || min) <= (leftTo || max);
};

const validatePricePlanPayload = async (payload = {}, options = {}) => {
  const existingPlan = options.existingPlan || null;
  const existing = existingPlan?.toObject ? existingPlan.toObject() : (existingPlan || {});
  const effective = { ...existing, ...payload };
  const errors = [];
  const warnings = [];

  if (!String(effective.name || "").trim()) errors.push(issue("name", "required", "Naziv cenovnika je obavezan."));
  if (!effective.venue) errors.push(issue("venue", "required", "Scena cenovnika je obavezna."));
  if (!PRICE_PLAN_STATUSES.includes(effective.status || "draft")) {
    errors.push(issue("status", "invalid_status", "Status cenovnika nije podržan."));
  }

  const currency = String(effective.currency || "RSD").toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    errors.push(issue("currency", "unsupported_currency", `Podržane valute su: ${SUPPORTED_CURRENCIES.join(", ")}.`));
  }

  const productionTypes = [...new Set(effective.productionTypes || [])];
  if (!productionTypes.length) {
    errors.push(issue("productionTypes", "required", "Izaberite najmanje jedan tip predstave."));
  }
  const invalidType = productionTypes.find((value) => !PRODUCTION_TYPES.includes(value));
  if (invalidType) errors.push(issue("productionTypes", "invalid_type", `Tip predstave ${invalidType} nije podržan.`));

  const validFrom = parseDate(effective.validFrom);
  const validTo = parseDate(effective.validTo);
  if (validFrom === false) errors.push(issue("validFrom", "invalid_date", "Početak važenja nije ispravan datum."));
  if (validTo === false) errors.push(issue("validTo", "invalid_date", "Kraj važenja nije ispravan datum."));
  if (validFrom && validTo && validTo < validFrom) {
    errors.push(issue("validTo", "invalid_range", "Kraj važenja ne može biti pre početka."));
  }

  const venue = await loadReference(Venue, effective.venue, "venue", errors);
  const rules = effective.rules || [];
  if (!rules.length) errors.push(issue("rules", "required", "Cenovnik mora imati najmanje jednu cenu."));

  const categoryIds = rules.map((rule) => idOf(rule.priceCategory)).filter(Boolean);
  const duplicates = categoryIds.filter((id, index) => categoryIds.indexOf(id) !== index);
  if (duplicates.length) errors.push(issue("rules", "duplicate_category", "Ista cenovna kategorija ne može biti dodata više puta."));

  rules.forEach((rule, index) => {
    if (!validObjectId(rule.priceCategory)) {
      errors.push(issue(`rules.${index}.priceCategory`, "invalid_object_id", "Cenovna kategorija nije ispravna."));
    }
    const amount = Number(rule.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) {
      errors.push(issue(`rules.${index}.amount`, "invalid_amount", "Cena mora biti nenegativan broj u dozvoljenom opsegu."));
    }
  });

  const categories = categoryIds.length
    ? await PriceCategory.find({ _id: { $in: categoryIds } })
    : [];
  if (categories.length !== new Set(categoryIds).size) {
    errors.push(issue("rules", "category_not_found", "Jedna ili više cenovnih kategorija ne postoje."));
  }

  const existingCategoryIds = new Set((existing.rules || []).map((rule) => idOf(rule.priceCategory)));
  categories.forEach((category) => {
    if (category.status !== "active" && !existingCategoryIds.has(idOf(category))) {
      errors.push(issue("rules", "inactive_category", `Kategorija ${category.code} nije aktivna i ne može se dodati u novi cenovnik.`));
    } else if (category.status !== "active" && (effective.status || "draft") === "active") {
      warnings.push(issue("rules", "inactive_category", `Aktivni cenovnik koristi neaktivnu kategoriju ${category.code}.`));
    }
  });

  const allCategory = categories.find((category) => category.code === "ALL");
  if (allCategory && rules.length > 1) {
    errors.push(issue("rules", "all_must_be_single", "Kategorija ALL mora biti jedina cena u cenovniku sa jedinstvenom cenom."));
  }

  if (venue && (effective.status || "draft") === "active" && productionTypes.length) {
    const candidates = await PricePlan.find({
      _id: existingPlan ? { $ne: existingPlan._id } : { $exists: true },
      venue: venue._id,
      status: "active",
      isPremiere: Boolean(effective.isPremiere),
      productionTypes: { $in: productionTypes },
    }).select("name productionTypes validFrom validTo");

    const overlap = candidates.find((candidate) => rangesOverlap(
      validFrom || null,
      validTo || null,
      candidate.validFrom || null,
      candidate.validTo || null
    ));
    if (overlap) {
      warnings.push(issue("validFrom", "overlapping_active_plan", `Aktivni cenovnik \"${overlap.name}\" ima preklapajuća pravila za istu scenu i tip predstave.`, {
        pricePlanId: idOf(overlap),
      }));
    }
  }

  return { errors, warnings, effective, references: { venue, categories } };
};

const getEventUsage = async (eventId) => {
  const now = new Date();
  const [orders, orderItems, locks, activeLocks] = await Promise.all([
    Order.countDocuments({ event: eventId }),
    OrderItem.countDocuments({ event: eventId }),
    SeatLock.countDocuments({ event: eventId }),
    SeatLock.countDocuments({ event: eventId, status: "active", expiresAt: { $gt: now } }),
  ]);
  return { orders, orderItems, locks, activeLocks, hasHistory: orders + orderItems + locks > 0 };
};

const getPricePlanUsage = async (pricePlanId) => {
  const events = await Event.find({ pricePlan: pricePlanId }).select("_id status saleStatus startsAt");
  const eventIds = events.map((event) => event._id);
  const [orders, orderItems, locks] = eventIds.length
    ? await Promise.all([
        Order.countDocuments({ event: { $in: eventIds } }),
        OrderItem.countDocuments({ event: { $in: eventIds } }),
        SeatLock.countDocuments({ event: { $in: eventIds } }),
      ])
    : [0, 0, 0];
  return {
    events: events.length,
    futureEvents: events.filter((event) => new Date(event.startsAt) > new Date()).length,
    orders,
    orderItems,
    locks,
    hasUsage: events.length + orders + orderItems + locks > 0,
    eventIds: eventIds.map(String),
  };
};

const getPriceCategoryUsage = async (categoryId) => {
  const [seats, pricePlans, orderItems] = await Promise.all([
    Seat.countDocuments({ priceCategory: categoryId }),
    PricePlan.countDocuments({ "rules.priceCategory": categoryId }),
    OrderItem.countDocuments({ priceCategory: categoryId }),
  ]);
  return { seats, pricePlans, orderItems, hasUsage: seats + pricePlans + orderItems > 0 };
};

const getPublicTicketingReadiness = async (event, { requireOnSale = false } = {}) => {
  const validation = await validateEventConfiguration({}, { existingEvent: event });
  const errors = [...validation.errors];
  const now = new Date();
  const status = normalizeEventStatus(event.status);
  const saleStatus = normalizeSaleStatus(event.saleStatus);

  if (status !== "scheduled") {
    errors.push(issue("status", "not_publicly_ticketable", "Termin nije u statusu Zakazano."));
  }
  if (event.startsAt && new Date(event.startsAt) <= now) {
    errors.push(issue("startsAt", "event_started", "Termin je već počeo ili je završen."));
  }
  if (!event.ticketing?.enabled || event.ticketing?.provider !== "internal") {
    errors.push(issue("ticketing", "internal_ticketing_unavailable", "Interna online prodaja nije dostupna za ovaj termin."));
  }
  if (requireOnSale && saleStatus !== "on_sale") {
    errors.push(issue("saleStatus", "not_on_sale", "Ulaznice trenutno nisu u prodaji."));
  }
  if (requireOnSale && event.saleStartsAt && new Date(event.saleStartsAt) > now) {
    errors.push(issue("saleStartsAt", "sale_not_started", "Prodaja još nije počela."));
  }
  if (requireOnSale && event.saleEndsAt && new Date(event.saleEndsAt) <= now) {
    errors.push(issue("saleEndsAt", "sale_ended", "Prodaja je završena."));
  }

  return { ready: errors.length === 0, errors, warnings: validation.warnings };
};

const eventDangerousChanges = (event, payload = {}) => {
  const changes = [];
  const idFields = ["production", "venue", "seatMap", "pricePlan"];
  idFields.forEach((field) => {
    if (payload[field] !== undefined && !sameId(event[field], payload[field])) changes.push(field);
  });
  if (payload.startsAt !== undefined && !sameDate(event.startsAt, payload.startsAt)) changes.push("startsAt");
  if (payload.ticketing?.provider !== undefined
      && event.ticketing?.provider !== payload.ticketing.provider) changes.push("ticketing.provider");
  return changes;
};

const pricePlanCriticalChanges = (plan, payload = {}) => {
  const changes = [];
  if (payload.venue !== undefined && !sameId(plan.venue, payload.venue)) changes.push("venue");
  if (payload.currency !== undefined && plan.currency !== String(payload.currency).toUpperCase()) changes.push("currency");
  if (payload.isPremiere !== undefined && Boolean(plan.isPremiere) !== Boolean(payload.isPremiere)) changes.push("isPremiere");
  if (payload.validFrom !== undefined && !sameDate(plan.validFrom, payload.validFrom)) changes.push("validFrom");
  if (payload.validTo !== undefined && !sameDate(plan.validTo, payload.validTo)) changes.push("validTo");
  if (payload.productionTypes !== undefined
      && JSON.stringify([...(plan.productionTypes || [])].sort()) !== JSON.stringify([...(payload.productionTypes || [])].sort())) {
    changes.push("productionTypes");
  }
  if (payload.rules !== undefined) {
    const serializeRules = (rules) => JSON.stringify((rules || []).map((rule) => ({
      priceCategory: idOf(rule.priceCategory),
      amount: Number(rule.amount),
      label: String(rule.label || ""),
    })).sort((a, b) => a.priceCategory.localeCompare(b.priceCategory)));
    if (serializeRules(plan.rules) !== serializeRules(payload.rules)) changes.push("rules");
  }
  return changes;
};

module.exports = {
  PRODUCTION_TYPES,
  conflictError,
  eventDangerousChanges,
  getEventUsage,
  getPublicTicketingReadiness,
  getPriceCategoryUsage,
  getPricePlanUsage,
  idOf,
  issue,
  normalizeEventPayload,
  normalizePricePlanPayload,
  pricePlanCriticalChanges,
  validateEventConfiguration,
  validatePricePlanPayload,
  validationError,
};
