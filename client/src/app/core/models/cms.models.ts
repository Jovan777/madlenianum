import { MediaItem } from './media.models';

export type ContentStatus = 'draft' | 'published' | 'archived';

export interface CmsOption {
  id: string;
  label: string;
  meta?: string;
  image?: MediaItem | null;
  status?: string;
}

export interface SeoFields {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  noIndex: boolean;
}

export interface GalleryItemInput {
  media: string | MediaItem;
  caption: string;
  credit: string;
  altText: string;
  displayOrder: number;
  translations?: {
    en?: {
      caption?: string;
      credit?: string;
      altText?: string;
    };
  };
}

export interface CmsListResponse<T> {
  success: boolean;
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CmsItemResponse<T> {
  success: boolean;
  item: T;
  preview?: boolean;
  robots?: string;
}

export interface CmsListItem {
  _id?: string;
  id?: string;
  title?: string;
  displayName?: string;
  slug?: string;
  status?: ContentStatus;
  type?: string;
  category?: string;
  season?: string;
  isFeatured?: boolean;
  updatedAt?: string;
  publishedAt?: string;
  image?: MediaItem;
  poster?: MediaItem;
  professions?: string[];
  pageType?: string;
}

export interface FormOptionsResponse {
  success: boolean;
  options: Record<string, unknown[]>;
}
