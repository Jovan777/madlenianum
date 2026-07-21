export type MediaFileType = 'image' | 'document' | 'video' | 'other';

export interface MediaAdminReference {
  _id?: string;
  username?: string;
  email?: string;
}

export interface MediaItem {
  _id: string;
  id?: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  storagePath?: string;
  fileType: MediaFileType;
  title?: string;
  alt?: string;
  altText?: string;
  caption?: string;
  credit?: string;
  createdBy?: MediaAdminReference | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaListParams {
  page?: number;
  limit?: number;
  search?: string;
  fileType?: MediaFileType | 'all';
  sort?: 'newest' | 'oldest' | 'name';
}

export interface MediaListResponse {
  success: boolean;
  items: MediaItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MediaUploadResponse {
  success: boolean;
  item: MediaItem;
}

export interface MediaMultipleUploadResponse {
  success: boolean;
  count: number;
  items: MediaItem[];
}

export interface MediaMetadataPayload {
  title: string;
  altText: string;
  caption: string;
  credit: string;
}

export interface MediaUsage {
  resourceType: string;
  resourceId: string;
  resourceTitle: string;
  field: string;
}

export interface MediaUsageResponse {
  success: boolean;
  inUse: boolean;
  usage: MediaUsage[];
}

export interface MediaDeleteResponse {
  success: boolean;
  message: string;
  fileDeleted?: boolean;
}

export interface MediaSelectionResult {
  ids: string[];
  items: MediaItem[];
}

export type MediaSelectionValue = string | MediaItem;
