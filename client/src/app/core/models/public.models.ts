export interface PublicMedia {
  _id?: string;
  id?: string;
  title?: string;
  altText?: string;
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
  subtitle?: string;
  shortDescription?: string;
  description?: string;
  synopsis?: string;
  poster?: PublicMedia | string;
  gallery?: Array<PublicMedia | string>;
  creativeTeam?: any[];
  cast?: any[];
  season?: string;
  tags?: string[];
  isFeatured?: boolean;
  status?: string;
}

export interface PublicEvent {
  _id?: string;
  id?: string;
  production?: PublicProduction | string;
  venue?: any;
  startsAt?: string;
  endsAt?: string;
  badge?: string;
  status?: string;
  saleStatus?: string;
  ticketing?: any;
  seatMap?: any;
  pricePlan?: any;
  maxTicketsPerOrder?: number;
  lockDurationMinutes?: number;
}

export interface PublicPromoSlide {
  _id?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  image?: PublicMedia | string;
  production?: PublicProduction | string;
  event?: PublicEvent | string;
  linkUrl?: string;
  buttonLabel?: string;
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
