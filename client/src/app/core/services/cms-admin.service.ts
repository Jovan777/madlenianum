import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { CmsItemResponse, CmsListResponse, FormOptionsResponse } from '../models/cms.models';

@Injectable({ providedIn: 'root' })
export class CmsAdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private readonly http: HttpClient) {}

  list<T>(resource: string, query: Record<string, string | number | boolean | undefined>) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<CmsListResponse<T>>(`${this.apiUrl}/${resource}`, { params });
  }

  get<T>(resource: string, id: string) {
    return this.http.get<CmsItemResponse<T>>(`${this.apiUrl}/${resource}/${id}`);
  }

  create<T>(resource: string, payload: unknown) {
    return this.http.post<CmsItemResponse<T>>(`${this.apiUrl}/${resource}`, payload);
  }

  update<T>(resource: string, id: string, payload: unknown) {
    return this.http.patch<CmsItemResponse<T>>(`${this.apiUrl}/${resource}/${id}`, payload);
  }

  archive<T>(resource: string, id: string) {
    return this.http.patch<CmsItemResponse<T>>(`${this.apiUrl}/${resource}/${id}/archive`, {});
  }

  preview<T>(resource: string, id: string) {
    return this.http.get<CmsItemResponse<T>>(`${this.apiUrl}/${resource}/${id}/preview`);
  }

  getStructuredPage<T>(pageType: 'about' | 'contact') {
    return this.http.get<CmsItemResponse<T>>(`${this.apiUrl}/pages/structured/${pageType}`);
  }

  updateStructuredPage<T>(pageType: 'about' | 'contact', payload: unknown) {
    return this.http.put<CmsItemResponse<T>>(`${this.apiUrl}/pages/structured/${pageType}`, payload);
  }

  previewStructuredPage<T>(pageType: 'about' | 'contact') {
    return this.http.get<CmsItemResponse<T>>(`${this.apiUrl}/pages/structured/${pageType}/preview`);
  }

  getSingleton<T>(resource: 'homepage-config' | 'site-settings') {
    return this.http.get<CmsItemResponse<T>>(`${this.apiUrl}/${resource}`);
  }

  updateSingleton<T>(resource: 'homepage-config' | 'site-settings', payload: unknown) {
    return this.http.put<CmsItemResponse<T>>(`${this.apiUrl}/${resource}`, payload);
  }

  previewHomepage<T>() {
    return this.http.get<T>(`${this.apiUrl}/homepage-config/preview`);
  }

  formOptions(kind: 'production' | 'artist' | 'news' | 'homepage' | 'promo-slide') {
    return this.http.get<FormOptionsResponse>(`${this.apiUrl}/form-options/${kind}`);
  }
}
