import { GalleryItemInput, SeoFields } from './cms.models';
import { MediaItem } from './media.models';
import { PublicGalleryItem, PublicMedia, PublicProduction, PublicSeo, PublicVenue } from './public.models';

export type ContentStatus = 'draft' | 'published' | 'archived';
export type CostumeGender = 'female' | 'male' | 'unisex' | 'children' | 'other';
export type FundusCondition = 'excellent' | 'good' | 'fair' | 'needs_repair' | 'archived';
export type PropScenographyType = 'prop' | 'scenography';
export type InquiryStatus = 'new' | 'in_review' | 'contacted' | 'qualified' | 'closed' | 'rejected';
export type InquiryEmailStatus = 'pending' | 'sent' | 'failed' | 'not_configured';

export interface Phase6APagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Phase6AListResponse<T> extends Phase6APagination {
  success: boolean;
  items: T[];
  pagination: Phase6APagination;
}

export interface Phase6AItemResponse<T> {
  success: boolean;
  item: T;
  preview?: boolean;
  robots?: string;
  message?: string;
}

export interface FundusBaseItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  mainImage?: PublicMedia | null;
  gallery: PublicMedia[];
  galleryItems: PublicGalleryItem[];
  inventoryNumber: string;
  condition: FundusCondition;
  availabilityNote?: string;
  relatedProduction?: PublicProduction | null;
  isFeatured: boolean;
  displayOrder: number;
  seo?: PublicSeo;
  status?: ContentStatus;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostumeItem extends FundusBaseItem {
  shortDescription: string;
  gender: CostumeGender;
  epoch: string;
  size?: string;
  color?: string;
  material?: string;
}

export interface PropScenographyItem extends FundusBaseItem {
  itemType: PropScenographyType;
  category: string;
  epochOrStyle: string;
  dimensions?: { widthCm?: number; heightCm?: number; depthCm?: number; note?: string };
  material?: string;
  weight?: number;
}

export interface RentalSpace {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  heroImage?: PublicMedia | null;
  gallery: PublicMedia[];
  galleryItems: PublicGalleryItem[];
  seatedCapacity: number;
  standingCapacity: number;
  areaSqm: number;
  amenities: string[];
  technicalEquipment: string[];
  suitableEventTypes: string[];
  accessibilityInfo?: string;
  dressingRooms?: string;
  cateringInfo?: string;
  barInfo?: string;
  internetInfo?: string;
  avInfo?: string;
  floorPlanPdf?: PublicMedia | null;
  linkedVenue?: PublicVenue | null;
  isFeatured: boolean;
  displayOrder: number;
  seo?: PublicSeo;
  status?: ContentStatus;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InquiryEmailDelivery {
  status: InquiryEmailStatus;
  sentAt?: string;
  lastAttemptAt?: string;
  lastError?: string;
  resendCount?: number;
  lastResendAt?: string;
}

export interface InquiryHistoryEntry {
  fromStatus?: string;
  toStatus: InquiryStatus;
  reason?: string;
  source?: string;
  changedAt?: string;
}

export interface InquiryBase {
  id: string;
  referenceNumber: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  phone: string;
  desiredDate?: string;
  approximateGuestCount?: number;
  note?: string;
  status: InquiryStatus;
  statusLabel: string;
  createdAt?: string;
  updatedAt?: string;
  internalNotes?: string;
  emailDelivery?: InquiryEmailDelivery;
  statusHistory?: InquiryHistoryEntry[];
}

export interface RentalInquiry extends InquiryBase {
  rentalSpace?: RentalSpace;
  rentalSpaceSnapshot?: {
    rentalSpaceId?: string;
    title?: string;
    slug?: string;
    seatedCapacity?: number;
    standingCapacity?: number;
  };
}

export interface EventPlanningInquiry extends InquiryBase {
  preferredRentalSpace?: RentalSpace;
  preferredRentalSpaceSnapshot?: { title?: string; slug?: string };
  eventType?: string;
}

export interface RentalInquiryPayload {
  rentalSpace: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  phone: string;
  desiredDate?: string;
  approximateGuestCount?: number | null;
  note?: string;
  idempotencyKey: string;
}

export interface EventPlanningInquiryPayload {
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  phone: string;
  preferredRentalSpace?: string;
  desiredDate?: string;
  approximateGuestCount?: number | null;
  eventType?: string;
  note?: string;
  idempotencyKey: string;
}

export interface FundusAdminPayload {
  title: string;
  slug?: string;
  description: string;
  mainImage: string | null;
  galleryItems: GalleryItemInput[];
  inventoryNumber: string;
  condition: FundusCondition;
  availabilityNote?: string;
  relatedProduction?: string | null;
  status: ContentStatus;
  publishedAt?: string;
  isFeatured: boolean;
  displayOrder: number;
  seo: SeoFields;
}

export interface RentalSpaceAdminPayload {
  title: string;
  slug?: string;
  shortDescription: string;
  description: string;
  heroImage: string | null;
  galleryItems: GalleryItemInput[];
  seatedCapacity: number;
  standingCapacity: number;
  areaSqm: number;
  amenities: string[];
  technicalEquipment: string[];
  suitableEventTypes: string[];
  accessibilityInfo?: string;
  dressingRooms?: string;
  cateringInfo?: string;
  barInfo?: string;
  internetInfo?: string;
  avInfo?: string;
  floorPlanPdf: string | null;
  linkedVenue?: string | null;
  status: ContentStatus;
  publishedAt?: string;
  isFeatured: boolean;
  displayOrder: number;
  seo: SeoFields;
}

export type Phase6AMediaSelection = string | MediaItem | PublicMedia;
