const COSTUME_GENDERS = ["female", "male", "unisex", "children", "other"];

const FUNDUS_CONDITIONS = ["excellent", "good", "fair", "needs_repair", "archived"];

const PROP_SCENOGRAPHY_TYPES = ["prop", "scenography"];

const INQUIRY_STATUSES = [
  "new",
  "in_review",
  "contacted",
  "qualified",
  "closed",
  "rejected",
];

const INQUIRY_EMAIL_STATUSES = [
  "pending",
  "sent",
  "failed",
  "not_configured",
];

const INQUIRY_STATUS_LABELS = {
  new: "Novo",
  in_review: "U obradi",
  contacted: "Kontaktirano",
  qualified: "Kvalifikovano",
  closed: "Zatvoreno",
  rejected: "Odbijeno",
};

module.exports = {
  COSTUME_GENDERS,
  FUNDUS_CONDITIONS,
  INQUIRY_EMAIL_STATUSES,
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  PROP_SCENOGRAPHY_TYPES,
};
