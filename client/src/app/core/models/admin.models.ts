export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'administrator' | 'editor';
  language: 'sr' | 'en';
}

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  admin: AdminUser;
}

export interface AdminMeResponse {
  success: boolean;
  admin: AdminUser;
}

export interface ApiListResponse<T> {
  success: boolean;
  items: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiItemResponse<T> {
  success: boolean;
  item: T;
  meta?: Record<string, unknown>;
}

export interface AdminValidationIssue {
  field: string;
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface AdminReference {
  _id: string;
  id?: string;
  name?: string;
  title?: string;
  type?: string;
  status?: string;
}

export interface AdminTicketingConfig {
  enabled: boolean;
  provider: 'internal' | 'legacy_php' | 'external' | 'manual';
  legacyEventId?: string;
  externalCheckoutUrl?: string;
  note?: string;
}

export interface AdminEvent {
  _id: string;
  production: AdminReference;
  venue: AdminReference;
  startsAt: string;
  endsAt?: string | null;
  isPremiere: boolean;
  badge?: string;
  status: string;
  saleStatus: string;
  seatMap?: AdminReference | null;
  pricePlan?: AdminPricePlan | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  maxTicketsPerOrder: number;
  lockDurationMinutes: number;
  ticketing: AdminTicketingConfig;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  configurationWarnings?: AdminValidationIssue[];
}

export interface AdminPriceRule {
  priceCategory: AdminPriceCategory | string;
  amount: number;
  label?: string;
}

export interface AdminUsage {
  events?: number;
  futureEvents?: number;
  orders?: number;
  orderItems?: number;
  locks?: number;
  seats?: number;
  pricePlans?: number;
  activeLocks?: number;
  hasUsage?: boolean;
  hasHistory?: boolean;
}

export interface AdminPricePlan {
  _id: string;
  name: string;
  venue: AdminReference;
  productionTypes: string[];
  isPremiere: boolean;
  currency: string;
  rules: AdminPriceRule[];
  validFrom?: string | null;
  validTo?: string | null;
  notes?: string;
  status: string;
  revision: number;
  parentPlan?: AdminReference | null;
  usage?: AdminUsage;
  configurationWarnings?: AdminValidationIssue[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminPriceCategory {
  _id: string;
  code: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  usage?: AdminUsage;
}

export interface AdminEventStats {
  totalConfiguredSeats: number;
  sellableSeats: number;
  unavailableSeats: number;
  availableSeats: number;
  activeLocksCount: number;
  reservedSeatsCount: number;
  paidSeatsCount: number;
  cancelledOrExpiredItemsCount: number;
  occupancyPercentage: number;
  reservedOrdersCount: number;
  paidOrdersCount: number;
  cancelledOrdersCount: number;
  paidRevenue: number;
  currency: string;
}

export interface AdminEventSummary {
  event: AdminEvent;
  warnings: AdminValidationIssue[];
  stats: AdminEventStats;
}

export interface AdminOption<T = string> {
  value: T;
  label: string;
}

export interface AdminEventFormOptions {
  productions: AdminReference[];
  venues: AdminReference[];
  seatMaps: AdminReference[];
  pricePlans: AdminPricePlan[];
  priceCategories: AdminPriceCategory[];
  eventStatuses: AdminOption[];
  saleStatuses: AdminOption[];
  ticketingProviders: AdminOption[];
  productionTypes: AdminOption[];
}

export interface AdminPricePlanFormOptions {
  venues: AdminReference[];
  priceCategories: AdminPriceCategory[];
  productionTypes: AdminOption[];
  statuses: AdminOption[];
}

export interface AdminMenuItem {
  label: string;
  path: string;
  icon: string;
  description?: string;
}

export interface AdminSystemStatusResponse {
  success: boolean;
  status: string;
  counts: Record<string, number>;
  warnings: Record<string, number>;
  warningItems?: Array<AdminValidationIssue & {
    targetType: 'event' | 'pricePlan';
    targetId: string;
    targetLabel: string;
    link: string;
  }>;
}
