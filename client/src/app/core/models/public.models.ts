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
  priceCategory?: any;
  price?: {
    amount: number;
    currency: string;
    priceCategory?: any;
  } | null;
  availabilityStatus: 'available' | 'locked' | 'reserved' | 'sold' | 'unavailable' | string;
}

export interface EventSeatsResponse {
  success: boolean;
  event: PublicEvent;
  seats: PublicSeat[];
}

export interface PublicListResponse<T> {
  success: boolean;
  items?: T[];
  data?: T[];
  [key: string]: any;
}
