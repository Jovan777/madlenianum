import {
  ContentStatus,
  CostumeGender,
  FundusCondition,
  InquiryEmailStatus,
  InquiryStatus,
  PropScenographyType,
} from './phase6a.models';

export const CONTENT_STATUS_OPTIONS: Array<{ value: ContentStatus; label: string }> = [
  { value: 'draft', label: 'Nacrt' },
  { value: 'published', label: 'Objavljeno' },
  { value: 'archived', label: 'Arhivirano' },
];

export const COSTUME_GENDER_OPTIONS: Array<{ value: CostumeGender | ''; label: string }> = [
  { value: '', label: 'Svi polovi' },
  { value: 'female', label: 'Ženski' },
  { value: 'male', label: 'Muški' },
  { value: 'unisex', label: 'Uniseks' },
  { value: 'children', label: 'Dečji' },
  { value: 'other', label: 'Ostalo' },
];

export const FUNDUS_CONDITION_OPTIONS: Array<{ value: FundusCondition; label: string }> = [
  { value: 'excellent', label: 'Odlično' },
  { value: 'good', label: 'Dobro' },
  { value: 'fair', label: 'Zadovoljavajuće' },
  { value: 'needs_repair', label: 'Potrebna popravka' },
  { value: 'archived', label: 'Van upotrebe' },
];

export const PROP_TYPE_OPTIONS: Array<{ value: PropScenographyType | ''; label: string }> = [
  { value: '', label: 'Sve vrste' },
  { value: 'prop', label: 'Rekvizit' },
  { value: 'scenography', label: 'Scenografija' },
];

export const INQUIRY_STATUS_OPTIONS: Array<{ value: InquiryStatus | ''; label: string }> = [
  { value: '', label: 'Svi statusi' },
  { value: 'new', label: 'Novo' },
  { value: 'in_review', label: 'U obradi' },
  { value: 'contacted', label: 'Kontaktirano' },
  { value: 'qualified', label: 'Kvalifikovano' },
  { value: 'closed', label: 'Zatvoreno' },
  { value: 'rejected', label: 'Odbijeno' },
];

export const EMAIL_STATUS_OPTIONS: Array<{ value: InquiryEmailStatus | ''; label: string }> = [
  { value: '', label: 'Svi email statusi' },
  { value: 'pending', label: 'Čeka slanje' },
  { value: 'sent', label: 'Poslato' },
  { value: 'failed', label: 'Slanje nije uspelo' },
  { value: 'not_configured', label: 'Email nije podešen' },
];

const EN_GENDER: Record<string, string> = { female: 'Women', male: 'Men', unisex: 'Unisex', children: 'Children', other: 'Other' };
const EN_CONDITION: Record<string, string> = { excellent: 'Excellent', good: 'Good', fair: 'Fair', needs_repair: 'Needs repair', archived: 'Out of use' };
const EN_PROP_TYPE: Record<string, string> = { prop: 'Prop', scenography: 'Scenography' };

export const costumeGenderLabel = (value?: string, locale: 'sr' | 'en' = 'sr'): string =>
  locale === 'en'
    ? EN_GENDER[value || ''] || 'Not specified'
    : COSTUME_GENDER_OPTIONS.find((option) => option.value === value)?.label || 'Nije navedeno';

export const conditionLabel = (value?: string, locale: 'sr' | 'en' = 'sr'): string =>
  locale === 'en'
    ? EN_CONDITION[value || ''] || 'Not specified'
    : FUNDUS_CONDITION_OPTIONS.find((option) => option.value === value)?.label || 'Nije navedeno';

export const propTypeLabel = (value?: string, locale: 'sr' | 'en' = 'sr'): string =>
  locale === 'en'
    ? EN_PROP_TYPE[value || ''] || 'Item'
    : PROP_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Predmet';

export const inquiryStatusLabel = (value?: string): string =>
  INQUIRY_STATUS_OPTIONS.find((option) => option.value === value)?.label || value || 'Nepoznato';

export const emailStatusLabel = (value?: string): string =>
  EMAIL_STATUS_OPTIONS.find((option) => option.value === value)?.label || value || 'Nije zabeleženo';

export const contentStatusLabel = (value?: string): string =>
  CONTENT_STATUS_OPTIONS.find((option) => option.value === value)?.label || value || 'Nepoznato';
