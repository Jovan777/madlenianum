import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import {
  AdminEventFormOptions,
  AdminEventSummary,
  AdminPricePlanFormOptions,
  AdminSystemStatusResponse,
  AdminValidationIssue,
  ApiItemResponse,
  ApiListResponse,
} from '../models/admin.models';

@Injectable({
  providedIn: 'root',
})
export class AdminApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getList<T>(resource: string, query = '') {
    const suffix = query ? `?${query}` : '';
    return this.http.get<ApiListResponse<T>>(`${this.apiUrl}/admin/${resource}${suffix}`);
  }

  getItem<T>(resource: string, id: string) {
    return this.http.get<ApiItemResponse<T>>(`${this.apiUrl}/admin/${resource}/${id}`);
  }

  create<T>(resource: string, payload: unknown) {
    return this.http.post<ApiItemResponse<T>>(`${this.apiUrl}/admin/${resource}`, payload);
  }

  update<T>(resource: string, id: string, payload: unknown) {
    return this.http.patch<ApiItemResponse<T>>(`${this.apiUrl}/admin/${resource}/${id}`, payload);
  }

  delete(resource: string, id: string) {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.apiUrl}/admin/${resource}/${id}`
    );
  }

  getSystemStatus() {
    return this.http.get<AdminSystemStatusResponse>(`${this.apiUrl}/admin/system/status`);
  }

  getEventTicketingSummary(id: string) {
    return this.http.get<ApiItemResponse<AdminEventSummary>>(
      `${this.apiUrl}/admin/events/${id}/ticketing-summary`
    );
  }

  getEventFormOptions(query = '') {
    const suffix = query ? `?${query}` : '';
    return this.http.get<{ success: boolean; options: AdminEventFormOptions }>(
      `${this.apiUrl}/admin/form-options/event${suffix}`
    );
  }

  getProductionFormOptions() {
    return this.http.get<{ success: boolean; options: Record<string, any[]> }>(
      `${this.apiUrl}/admin/form-options/production`
    );
  }

  getArtistFormOptions() {
    return this.http.get<{ success: boolean; options: Record<string, any[]> }>(
      `${this.apiUrl}/admin/form-options/artist`
    );
  }

  getSeatMapFormOptions() {
    return this.http.get<{ success: boolean; options: Record<string, any[]> }>(
      `${this.apiUrl}/admin/form-options/seat-map`
    );
  }

  getPricePlanFormOptions() {
    return this.http.get<{ success: boolean; options: AdminPricePlanFormOptions }>(
      `${this.apiUrl}/admin/form-options/price-plan`
    );
  }

  updateOrderStatus(id: string, payload: unknown) {
    return this.http.patch<ApiItemResponse<unknown>>(
      `${this.apiUrl}/admin/orders/${id}/status`,
      payload
    );
  }

  validate<T = unknown>(resource: string, payload: unknown, id?: string) {
    const path = id ? `${resource}/${id}/validate` : `${resource}/validate`;
    return this.http.post<{
      success: boolean;
      valid: boolean;
      errors: AdminValidationIssue[];
      warnings: AdminValidationIssue[];
    }>(`${this.apiUrl}/admin/${path}`, payload);
  }

  duplicate<T>(resource: string, id: string, payload: unknown = {}) {
    return this.http.post<ApiItemResponse<T>>(
      `${this.apiUrl}/admin/${resource}/${id}/duplicate`,
      payload
    );
  }

  runAction<T>(resource: string, id: string, action: string) {
    return this.http.post<ApiItemResponse<T>>(
      `${this.apiUrl}/admin/${resource}/${id}/actions/${action}`,
      {}
    );
  }
}
