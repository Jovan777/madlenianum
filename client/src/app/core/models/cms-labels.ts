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

const labelFor = (options: Array<{ value: string; label: string }>, value?: string) => (
  options.find((option) => option.value === value)?.label || value || '-'
);

export const contentStatusLabel = (value?: string) => labelFor(CONTENT_STATUS_OPTIONS, value);
export const productionTypeLabel = (value?: string) => labelFor(PRODUCTION_TYPE_OPTIONS, value);
