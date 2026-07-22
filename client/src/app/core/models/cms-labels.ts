export const CONTENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Nacrt' },
  { value: 'published', label: 'Objavljeno' },
  { value: 'archived', label: 'Arhivirano' },
];

export const PRODUCTION_TYPE_OPTIONS = [
  { value: 'opera', label: 'Opera' },
  { value: 'opereta', label: 'Opereta' },
  { value: 'balet', label: 'Balet' },
  { value: 'drama', label: 'Drama' },
  { value: 'mjuzikl', label: 'Mjuzikl' },
  { value: 'koncert', label: 'Koncert' },
  { value: 'gostujuca_predstava', label: 'Gostujuca predstava' },
  { value: 'ostalo', label: 'Ostalo' },
];

export const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Nacrt' },
  { value: 'scheduled', label: 'Zakazano' },
  { value: 'completed', label: 'Završeno' },
  { value: 'cancelled', label: 'Otkazano' },
  { value: 'postponed', label: 'Odloženo' },
  { value: 'archived', label: 'Arhivirano' },
];

export const SALE_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Prodaja nije počela' },
  { value: 'on_sale', label: 'U prodaji' },
  { value: 'sold_out', label: 'Rasprodato' },
  { value: 'closed', label: 'Prodaja zatvorena' },
  { value: 'free', label: 'Slobodan ulaz' },
];

export const TICKETING_PROVIDER_OPTIONS = [
  { value: 'internal', label: 'Interna prodaja' },
  { value: 'legacy_php', label: 'Postojeći PHP sistem' },
  { value: 'external', label: 'Spoljni sistem' },
  { value: 'manual', label: 'Bez online prodaje' },
];

export const PRICE_PLAN_STATUS_OPTIONS = [
  { value: 'draft', label: 'Nacrt' },
  { value: 'active', label: 'Aktivan' },
  { value: 'inactive', label: 'Neaktivan' },
  { value: 'archived', label: 'Arhiviran' },
];

const labelFor = (options: Array<{ value: string; label: string }>, value?: string) => (
  options.find((option) => option.value === value)?.label || value || '-'
);

export const contentStatusLabel = (value?: string) => labelFor(CONTENT_STATUS_OPTIONS, value);
export const productionTypeLabel = (value?: string) => labelFor(PRODUCTION_TYPE_OPTIONS, value);
export const eventStatusLabel = (value?: string) => labelFor(
  EVENT_STATUS_OPTIONS,
  value === 'finished' ? 'completed' : value
);
export const saleStatusLabel = (value?: string) => labelFor(
  SALE_STATUS_OPTIONS,
  value === 'not_on_sale' ? 'not_started' : value === 'sales_closed' ? 'closed' : value
);
export const ticketingProviderLabel = (value?: string) => labelFor(TICKETING_PROVIDER_OPTIONS, value);
export const pricePlanStatusLabel = (value?: string) => labelFor(PRICE_PLAN_STATUS_OPTIONS, value);
