import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AdminSystemStatusResponse, ApiItemResponse, ApiListResponse } from '../models/admin.models';

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
    return this.http.get<ApiItemResponse<unknown>>(
      `${this.apiUrl}/admin/events/${id}/ticketing-summary`
    );
  }

  getEventFormOptions(query = '') {
    const suffix = query ? `?${query}` : '';
    return this.http.get<{ success: boolean; options: Record<string, any[]> }>(
      `${this.apiUrl}/admin/form-options/event${suffix}`
    );
  }

  getSeatMapFormOptions() {
    return this.http.get<{ success: boolean; options: Record<string, any[]> }>(
      `${this.apiUrl}/admin/form-options/seat-map`
    );
  }

  updateOrderStatus(id: string, payload: unknown) {
    return this.http.patch<ApiItemResponse<unknown>>(
      `${this.apiUrl}/admin/orders/${id}/status`,
      payload
    );
  }
}
