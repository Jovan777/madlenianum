import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  CostumeItem,
  EventPlanningInquiry,
  InquiryStatus,
  Phase6AItemResponse,
  Phase6AListResponse,
  PropScenographyItem,
  RentalInquiry,
  RentalSpace,
} from '../models/phase6a.models';

@Injectable({ providedIn: 'root' })
export class Phase6AAdminService {
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  constructor(private readonly http: HttpClient) {}

  listCostumes(query: Record<string, unknown>) {
    return this.list<CostumeItem>('fundus/costumes', query);
  }
  getCostume(id: string) {
    return this.get<CostumeItem>('fundus/costumes', id);
  }
  createCostume(payload: unknown) {
    return this.create<CostumeItem>('fundus/costumes', payload);
  }
  updateCostume(id: string, payload: unknown) {
    return this.update<CostumeItem>('fundus/costumes', id, payload);
  }

  listPropsScenography(query: Record<string, unknown>) {
    return this.list<PropScenographyItem>('fundus/props-scenography', query);
  }
  getPropScenography(id: string) {
    return this.get<PropScenographyItem>('fundus/props-scenography', id);
  }
  createPropScenography(payload: unknown) {
    return this.create<PropScenographyItem>('fundus/props-scenography', payload);
  }
  updatePropScenography(id: string, payload: unknown) {
    return this.update<PropScenographyItem>('fundus/props-scenography', id, payload);
  }

  listRentalSpaces(query: Record<string, unknown>) {
    return this.list<RentalSpace>('rental-spaces', query);
  }
  getRentalSpace(id: string) {
    return this.get<RentalSpace>('rental-spaces', id);
  }
  createRentalSpace(payload: unknown) {
    return this.create<RentalSpace>('rental-spaces', payload);
  }
  updateRentalSpace(id: string, payload: unknown) {
    return this.update<RentalSpace>('rental-spaces', id, payload);
  }

  preview<T>(resource: string, id: string, locale: 'sr' | 'en' = 'sr') {
    return this.http.get<Phase6AItemResponse<T>>(`${this.baseUrl}/${resource}/${id}/preview`, {
      params: { lang: locale },
    });
  }

  publish<T>(resource: string, id: string) {
    return this.http.post<Phase6AItemResponse<T>>(`${this.baseUrl}/${resource}/${id}/publish`, {});
  }

  archive<T>(resource: string, id: string) {
    return this.http.patch<Phase6AItemResponse<T>>(`${this.baseUrl}/${resource}/${id}/archive`, {});
  }

  remove(resource: string, id: string) {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/${resource}/${id}`,
    );
  }

  listRentalInquiries(query: Record<string, unknown>) {
    return this.list<RentalInquiry>('rental-inquiries', query);
  }
  getRentalInquiry(id: string) {
    return this.get<RentalInquiry>('rental-inquiries', id);
  }
  listEventPlanningInquiries(query: Record<string, unknown>) {
    return this.list<EventPlanningInquiry>('event-planning-inquiries', query);
  }
  getEventPlanningInquiry(id: string) {
    return this.get<EventPlanningInquiry>('event-planning-inquiries', id);
  }

  updateInquiryStatus<T>(
    resource: 'rental-inquiries' | 'event-planning-inquiries',
    id: string,
    status: InquiryStatus,
    reason: string,
  ) {
    return this.http.patch<Phase6AItemResponse<T>>(`${this.baseUrl}/${resource}/${id}/status`, {
      status,
      reason,
    });
  }

  updateInquiryNotes<T>(
    resource: 'rental-inquiries' | 'event-planning-inquiries',
    id: string,
    internalNotes: string,
  ) {
    return this.http.patch<Phase6AItemResponse<T>>(`${this.baseUrl}/${resource}/${id}/notes`, {
      internalNotes,
    });
  }

  resendInquiry(resource: 'rental-inquiries' | 'event-planning-inquiries', id: string) {
    return this.http.post<{
      success: boolean;
      sent: boolean;
      emailStatus: string;
      message: string;
    }>(`${this.baseUrl}/${resource}/${id}/resend`, {});
  }

  private list<T>(resource: string, query: Record<string, unknown>) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '')
        params = params.set(key, String(value));
    });
    return this.http.get<Phase6AListResponse<T>>(`${this.baseUrl}/${resource}`, { params });
  }

  private get<T>(resource: string, id: string) {
    return this.http.get<Phase6AItemResponse<T>>(`${this.baseUrl}/${resource}/${id}`);
  }

  private create<T>(resource: string, payload: unknown) {
    return this.http.post<Phase6AItemResponse<T>>(`${this.baseUrl}/${resource}`, payload);
  }

  private update<T>(resource: string, id: string, payload: unknown) {
    return this.http.patch<Phase6AItemResponse<T>>(`${this.baseUrl}/${resource}/${id}`, payload);
  }
}
