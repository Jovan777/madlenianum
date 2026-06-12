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
}
