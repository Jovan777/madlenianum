export interface PublicMedia {
  _id?: string;
  id?: string;
  title?: string;
  alt?: string;
  altText?: string;
  caption?: string;
  credit?: string;
  url?: string;
  path?: string;
}

export interface PublicExternalLink {
  id?: string;
  label?: string;
  url: string;
  type?: string;
  displayOrder?: number;
}

export interface PublicArtist {
  id?: string;
  displayName: string;
  slug: string;
  professions?: string[];
  biography?: string;
  image?: PublicMedia | string | null;
  gallery?: Array<PublicMedia | string>;
  galleryItems?: PublicGalleryItem[];
  links?: PublicExternalLink[];
  seo?: PublicSeo;
}

export interface PublicProduction {
  _id?: string;
  id?: string;
  title: string;
  slug: string;
  type?: string;
  authorComposer?: string;
  originalTitle?: string;
  subtitle?: string;
  shortDescription?: string;
  description?: string;
  synopsis?: string;
  poster?: PublicMedia | string;
  gallery?: Array<PublicMedia | string>;
  galleryItems?: PublicGalleryItem[];
  videos?: PublicVideo[];
  trailer?: PublicVideo | null;
  creativeTeam?: PublicProductionCredit[];
  primaryCredits?: PublicProductionCredit[];
  cast?: PublicCastMember[];
  announcement?: PublicProductionAnnouncement | null;
  venue?: PublicVenue | null;
  season?: string;
  durationMinutes?: number;
  performanceLanguage?: string;
  subtitles?: string;
  premiereDate?: string;
  tags?: string[];
  relationshipTypes?: string[];
  roles?: string[];
  isFeatured?: boolean;
  status?: string;
  seo?: PublicSeo;
}

export interface PublicProductionCredit {
  id?: string;
  roleKey?: string;
  label?: string;
  role?: string;
  name?: string;
  artist?: {
    id?: string;
    displayName?: string;
    slug?: string;
    image?: PublicMedia | string | null;
  } | null;
  note?: string;
  displayOrder?: number;
}

export interface PublicCastMember {
  id?: string;
  artist?: {
    id?: string;
    displayName?: string;
    slug?: string;
    image?: PublicMedia | string | null;
  } | null;
  name?: string;
  role?: string;
  character?: string;
  note?: string;
  displayOrder?: number;
}

export interface PublicProductionAnnouncement {
  isAnnounced?: boolean;
  month?: number;
  year?: number;
  text?: string;
  image?: PublicMedia | string | null;
  startsAt?: string;
  endsAt?: string;
}

export interface PublicGalleryItem {
  id?: string;
  media?: PublicMedia | string | null;
  caption?: string;
  credit?: string;
  altText?: string;
  displayOrder?: number;
}

export interface PublicVideo {
  id?: string;
  provider?: 'youtube' | 'vimeo' | 'external' | string;
  url: string;
  title?: string;
  thumbnail?: PublicMedia | string | null;
  isTrailer?: boolean;
  displayOrder?: number;
}

export interface PublicVenue {
  id?: string;
  name?: string;
  title?: string;
  slug?: string;
  venueType?: string;
  capacity?: number;
}

export interface PublicSaleAvailability {
  state: 'on_sale' | 'upcoming' | 'sold_out' | 'closed' | 'free' | 'cancelled' | 'postponed' | 'finished' | 'unavailable' | string;
  canPurchase: boolean;
  label: string;
}

export interface PublicEvent {
  _id?: string;
  id?: string;
  production?: PublicProduction | string;
  venue?: PublicVenue | null;
  startsAt?: string;
  endsAt?: string;
  isPremiere?: boolean;
  badge?: string;
  status?: string;
  saleStatus?: string;
  ticketing?: any;
  seatMap?: any;
  pricePlan?: any;
  maxTicketsPerOrder?: number;
  lockDurationMinutes?: number;
  saleStartsAt?: string;
  saleEndsAt?: string;
  saleAvailability?: PublicSaleAvailability;
}

export interface PublicPriceCategory {
  _id?: string;
  id?: string;
  code?: string;
  name?: string;
}

export interface PublicRepertoireMonth {
  year: number;
  month: number;
  count: number;
}

export interface PublicRepertoireResponse {
  success: boolean;
  view?: 'current' | 'announced' | 'archive';
  events: PublicEvent[];
  announcements?: PublicProduction[];
  availableMonths: PublicRepertoireMonth[];
  data?: {
    view?: 'current' | 'announced' | 'archive';
    month: number;
    year: number;
    events: PublicEvent[];
    announcements?: PublicProduction[];
    availableMonths: PublicRepertoireMonth[];
  };
}

export interface PublicPromoSlide {
  _id?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: PublicMedia | string;
  production?: PublicProduction | string;
  relatedProduction?: PublicProduction | string;
  event?: PublicEvent | string;
  relatedEvent?: PublicEvent | string;
  linkUrl?: string;
  linkLabel?: string;
  buttonLabel?: string;
}

export interface PublicNews {
  id?: string;
  title: string;
  slug: string;
  subtitle?: string;
  excerpt?: string;
  category?: string;
  image?: PublicMedia | string | null;
  relatedProduction?: PublicProduction | null;
  body?: string;
  gallery?: Array<PublicMedia | string>;
  galleryItems?: PublicGalleryItem[];
  attachment?: PublicMedia | string | null;
  externalLinks?: PublicExternalLink[];
  isFeatured?: boolean;
  seo?: PublicSeo;
  publishedAt?: string;
}

export interface PublicSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface HomepageSelectionConfig {
  enabled: boolean;
  heading?: string;
  limit?: number;
}

export interface PublicHomepageCta {
  id?: string;
  title: string;
  text?: string;
  image?: PublicMedia | string | null;
  linkLabel?: string;
  url: string;
  displayOrder?: number;
}

export interface PublicHomepageConfig {
  hero: HomepageSelectionConfig;
  upcomingEvents: HomepageSelectionConfig;
  repertoireProductions: HomepageSelectionConfig;
  featuredProductions: HomepageSelectionConfig;
  featuredNews: HomepageSelectionConfig;
  institutionalTeaser: HomepageSelectionConfig & {
    text?: string;
    image?: PublicMedia | string | null;
    ctaLabel?: string;
    ctaUrl?: string;
  };
  ctaCardsHeading?: string;
  ctaCards: PublicHomepageCta[];
  sections: Array<{ sectionType: string; displayOrder: number }>;
  seo?: PublicSeo;
}

export interface PublicHomeResponse {
  success: boolean;
  config: PublicHomepageConfig;
  slides: PublicPromoSlide[];
  upcomingEvents: PublicEvent[];
  repertoireProductions: PublicProduction[];
  featuredProductions: PublicProduction[];
  featuredNews: PublicNews[];
}

export interface PublicNavLink {
  label: string;
  url: string;
  displayOrder?: number;
}

export interface PublicSiteSettings {
  siteName: string;
  shortDescription?: string;
  mainLogo?: PublicMedia | string | null;
  footerLogo?: PublicMedia | string | null;
  socialLinks: Array<PublicNavLink & { platform?: string }>;
  legalLinks: PublicNavLink[];
  footerNavigation: Array<{ title: string; displayOrder?: number; links: PublicNavLink[] }>;
  partnerLogos: Array<{ label?: string; media?: PublicMedia | string | null; url?: string; displayOrder?: number }>;
  defaultSeo?: PublicSeo;
  contact?: { address?: string; generalEmail?: string; ticketOfficeEmail?: string; phones?: string[]; ticketOfficePhones?: string[] };
  fundusContact?: { email?: string; phone?: string };
  commercialContact?: { contactName?: string; email?: string; phone?: string; responseTimeText?: string };
}

export interface PublicSeat {
  id: string;
  _id?: string;
  section?: string;
  row?: string;
  number?: number;
  label: string;
  seatType?: string;
  visualGroup?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  isSellable?: boolean;
  priceCategory?: PublicPriceCategory | null;
  price?: {
    amount: number;
    currency: string;
    priceCategory?: PublicPriceCategory | null;
  } | null;
  availabilityStatus: 'available' | 'locked' | 'reserved' | 'sold' | 'unavailable' | 'box_office_only' | string;
  isAccessible?: boolean;
  isCompanion?: boolean;
  hasRestrictedView?: boolean;
  publicMessage?: string;
}

export interface EventSeatsResponse {
  success: boolean;
  event: PublicEvent;
  seats: PublicSeat[];
}

export interface PublicGuestSnapshot {
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
}

export interface PublicOrderItem {
  _id?: string;
  id?: string;
  seat?: PublicSeat | string | null;
  seatLabel: string;
  section?: string;
  row?: string;
  number?: number;
  priceCategory?: PublicPriceCategory | string | null;
  priceCategoryCode?: string;
  priceCategoryName?: string;
  finalPrice: number;
  currency: string;
  status: string;
}

export interface PublicOrderEvent {
  id?: string;
  productionId?: string;
  productionTitle: string;
  startsAt?: string | null;
  endsAt?: string | null;
  venueId?: string;
  venueName?: string;
  venueStage?: string;
}

export interface PublicOrder {
  reference: string;
  orderType: 'reservation' | 'purchase';
  orderTypeLabel: string;
  status: 'pending' | 'reserved' | 'pending_payment' | 'paid' | 'expired' | 'cancelled' | 'refunded' | string;
  statusLabel: string;
  paymentStatus?: string;
  paymentStatusLabel?: string;
  customer: PublicGuestSnapshot;
  event: PublicOrderEvent;
  items: PublicOrderItem[];
  subtotalAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  currency: string;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeatLockResponse {
  success: boolean;
  checkoutKey: string;
  expiresAt: string;
  lockDurationMinutes: number;
  seats: Array<{
    seatId: string;
    label: string;
    section?: string;
    row?: string;
    number?: number;
    price?: PublicSeat['price'];
    lockId: string;
    availabilityStatus: 'locked';
  }>;
}

export interface RestoredSeatLockResponse extends SeatLockResponse {
  restored: boolean;
}

export interface SeatReleaseResponse {
  success: boolean;
  releasedCount: number;
}

export interface CreateGuestOrderPayload {
  eventId: string;
  seatIds: string[];
  action: 'reserve' | 'purchase';
  customerSnapshot: PublicGuestSnapshot;
  checkoutKey: string;
  idempotencyKey: string;
}

export interface CreateGuestOrderResponse {
  success: boolean;
  action: 'reserve' | 'purchase';
  order: PublicOrder;
  idempotent?: boolean;
  accessToken?: string;
  secureOrderUrl?: string;
  emailStatus?: 'pending' | 'sent' | 'failed' | 'not_configured' | string;
}

export interface PublicListResponse<T> {
  success: boolean;
  items?: T[];
  data?: T[];
  [key: string]: any;
}
