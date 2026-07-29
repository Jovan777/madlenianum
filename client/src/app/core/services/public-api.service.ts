import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { MediaUrlService } from './media-url.service';
import { PublicLocaleService } from './public-locale.service';
import {
  CreateGuestOrderPayload,
  CreateGuestOrderResponse,
  EventSeatsResponse,
  PublicHomeResponse,
  PublicEvent,
  PublicListResponse,
  PublicNews,
  PublicOrder,
  PublicProduction,
  PublicRepertoireResponse,
  PublicSiteSettings,
  RestoredSeatLockResponse,
  SeatLockResponse,
  SeatReleaseResponse,
} from '../models/public.models';
import {
  CostumeItem,
  EventPlanningInquiry,
  EventPlanningInquiryPayload,
  Phase6AItemResponse,
  Phase6AListResponse,
  PropScenographyItem,
  RentalInquiry,
  RentalInquiryPayload,
  RentalSpace,
} from '../models/phase6a.models';

const PUBLIC_SESSION_KEY = 'madlenianum_public_session_id';

@Injectable({
  providedIn: 'root',
})
export class PublicApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly mediaUrls: MediaUrlService,
    readonly publicLocale: PublicLocaleService
  ) {}

  getHome() {
    return this.http.get<PublicHomeResponse>(`${this.apiUrl}/public/home`, { params: this.params() });
  }

  getSiteSettings() {
    return this.http.get<{ success: boolean; item: PublicSiteSettings }>(`${this.apiUrl}/public/site-settings`, {
      params: this.params(),
    });
  }

  getRepertoire(filters: { month?: number; year?: number; view?: 'current' | 'announced' | 'archive' } = {}) {
    let params = this.params();

    if (filters.month) params = params.set('month', String(filters.month));
    if (filters.year) params = params.set('year', String(filters.year));
    if (filters.view && filters.view !== 'current') params = params.set('view', filters.view);

    return this.http.get<PublicRepertoireResponse>(`${this.apiUrl}/public/repertoire`, { params });
  }

  getProductions() {
    return this.http.get<PublicListResponse<PublicProduction>>(`${this.apiUrl}/public/productions`, { params: this.params() });
  }

  getProduction(slug: string) {
    return this.http.get<any>(`${this.apiUrl}/public/productions/${encodeURIComponent(slug)}`, { params: this.params() });
  }

  getNews() {
    return this.http.get<PublicListResponse<PublicNews>>(`${this.apiUrl}/public/news`, { params: this.params() });
  }

  getNewsItem(slug: string) {
    return this.http.get<{ success: boolean; item: PublicNews }>(`${this.apiUrl}/public/news/${encodeURIComponent(slug)}`, {
      params: this.params(),
    });
  }

  getArtists() {
    return this.http.get<any>(`${this.apiUrl}/public/artists`, { params: this.params() });
  }

  getArtist(slug: string) {
    return this.http.get<any>(`${this.apiUrl}/public/artists/${encodeURIComponent(slug)}`, { params: this.params() });
  }

  getPage(slug: string) {
    return this.http.get<any>(`${this.apiUrl}/public/pages/${encodeURIComponent(slug)}`, { params: this.params() });
  }

  getCostumes(filters: Record<string, string | number | undefined> = {}) {
    return this.http.get<Phase6AListResponse<CostumeItem>>(`${this.apiUrl}/public/fundus/costumes`, {
      params: this.params(filters),
    });
  }

  getCostume(slug: string) {
    return this.http.get<Phase6AItemResponse<CostumeItem>>(`${this.apiUrl}/public/fundus/costumes/${encodeURIComponent(slug)}`, {
      params: this.params(),
    });
  }

  getPropsScenography(filters: Record<string, string | number | undefined> = {}) {
    return this.http.get<Phase6AListResponse<PropScenographyItem>>(`${this.apiUrl}/public/fundus/props-scenography`, {
      params: this.params(filters),
    });
  }

  getPropScenography(slug: string) {
    return this.http.get<Phase6AItemResponse<PropScenographyItem>>(
      `${this.apiUrl}/public/fundus/props-scenography/${encodeURIComponent(slug)}`,
      { params: this.params() }
    );
  }

  getRentalSpaces(filters: Record<string, string | number | undefined> = {}) {
    return this.http.get<Phase6AListResponse<RentalSpace>>(`${this.apiUrl}/public/rental-spaces`, {
      params: this.params(filters),
    });
  }

  getRentalSpace(slug: string) {
    return this.http.get<Phase6AItemResponse<RentalSpace>>(`${this.apiUrl}/public/rental-spaces/${encodeURIComponent(slug)}`, {
      params: this.params(),
    });
  }

  createRentalInquiry(payload: RentalInquiryPayload) {
    return this.http.post<Phase6AItemResponse<RentalInquiry> & { emailStatus?: string; idempotent?: boolean }>(
      `${this.apiUrl}/public/rental-inquiries`,
      { ...payload, locale: this.publicLocale.current() },
      { headers: { 'Idempotency-Key': payload.idempotencyKey } }
    );
  }

  createEventPlanningInquiry(payload: EventPlanningInquiryPayload) {
    return this.http.post<Phase6AItemResponse<EventPlanningInquiry> & { emailStatus?: string; idempotent?: boolean }>(
      `${this.apiUrl}/public/event-planning-inquiries`,
      { ...payload, locale: this.publicLocale.current() },
      { headers: { 'Idempotency-Key': payload.idempotencyKey } }
    );
  }

  getEventSeats(eventId: string) {
    return this.http.get<EventSeatsResponse>(`${this.apiUrl}/public/events/${eventId}/seats`, { params: this.params() });
  }

  lockSeats(eventId: string, seatIds: string[], checkoutKey: string) {
    return this.http.post<SeatLockResponse>(`${this.apiUrl}/public/events/${eventId}/seats/lock`, {
      sessionId: this.getSessionId(),
      seatIds,
      checkoutKey,
      locale: this.publicLocale.current(),
    });
  }

  restoreSeatLocks(eventId: string) {
    const params = this.params().set('sessionId', this.getSessionId());
    return this.http.get<RestoredSeatLockResponse>(
      `${this.apiUrl}/public/events/${eventId}/seats/locks/current`,
      { params }
    );
  }

  releaseSeats(eventId: string, seatIds: string[], checkoutKey = '') {
    return this.http.post<SeatReleaseResponse>(`${this.apiUrl}/public/events/${eventId}/seats/release`, {
      sessionId: this.getSessionId(),
      seatIds,
      checkoutKey,
      locale: this.publicLocale.current(),
    });
  }

  createGuestOrder(payload: CreateGuestOrderPayload) {
    return this.http.post<CreateGuestOrderResponse>(`${this.apiUrl}/public/orders`, {
      ...payload,
      sessionId: this.getSessionId(),
      locale: this.publicLocale.current(),
    });
  }

  getPublicOrder(identifier: string, token = '') {
    let params = this.params().set('sessionId', this.getSessionId());
    if (token) params = params.set('token', token);
    return this.http.get<{ success: boolean; order: PublicOrder }>(
      `${this.apiUrl}/public/orders/${encodeURIComponent(identifier)}`,
      { params }
    );
  }

  lookupPublicOrder(reference: string, email: string) {
    return this.http.post<{ success: boolean; order: PublicOrder }>(
      `${this.apiUrl}/public/orders/lookup`,
      { reference, email, locale: this.publicLocale.current() }
    );
  }

  subscribeNewsletter(email: string) {
    return this.http.post<any>(`${this.apiUrl}/public/newsletter/subscribe`, {
      email,
      language: this.publicLocale.current(),
      locale: this.publicLocale.current(),
    });
  }

  sendContactMessage(payload: Record<string, string>) {
    return this.http.post<any>(`${this.apiUrl}/public/contact`, {
      ...payload,
      locale: this.publicLocale.current(),
    });
  }

  getSessionId(): string {
    const existingSessionId = localStorage.getItem(PUBLIC_SESSION_KEY);

    if (existingSessionId) {
      return existingSessionId;
    }

    const sessionId = `mdl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PUBLIC_SESSION_KEY, sessionId);
    return sessionId;
  }

  mediaUrl(value: unknown): string {
    return this.mediaUrls.resolve(value);
  }

  extractItems<T>(response: any, keys: string[] = []): T[] {
    if (!response) {
      return [];
    }

    for (const root of this.responseRoots(response)) {
      for (const key of keys) {
        if (Array.isArray(root[key])) {
          return root[key] as T[];
        }
      }

      if (Array.isArray(root.items)) {
        return root.items as T[];
      }

      if (Array.isArray(root.data)) {
        return root.data as T[];
      }
    }

    return [];
  }

  extractItem<T>(response: any, keys: string[] = []): T | null {
    if (!response) {
      return null;
    }

    for (const root of this.responseRoots(response)) {
      for (const key of keys) {
        if (root[key]) {
          return root[key] as T;
        }
      }

      if (root.item || root.production || root.artist) {
        return (root.item || root.production || root.artist) as T;
      }
    }

    return null;
  }

  eventId(event: PublicEvent | string | null | undefined): string {
    if (!event) {
      return '';
    }

    if (typeof event === 'string') {
      return event;
    }

    return String(event.id || event._id || '');
  }

  productionSlug(production: PublicProduction | string | null | undefined): string {
    if (!production || typeof production === 'string') {
      return '';
    }

    return production.slug || '';
  }

  productionFromEvent(event: PublicEvent | null | undefined): PublicProduction | null {
    if (!event?.production || typeof event.production === 'string') {
      return null;
    }

    return event.production;
  }

  fallbackImage(index = 0): string {
    const images = [
      '/uploads/madlenianum/pluca_main.jpg',
      '/uploads/madlenianum/CARMEN%20SUITE%20%26%20BOLERO_main.jpg',
      '/uploads/madlenianum/gordost_i_predrasude_main.jpg',
      '/uploads/madlenianum/STAKLENA%20MENA%C5%BDERIJA_main.jpg',
      '/uploads/madlenianum/X%20%2B%20Y%20%3D%200_main.jpg',
    ];

    return this.mediaUrls.resolve(images[Math.abs(index) % images.length]);
  }

  typeLabel(type: string | undefined | null): string {
    const labels: Record<string, Record<string, string>> = {
      sr: {
        opera: 'Opera', opereta: 'Opereta', balet: 'Balet', drama: 'Drama', mjuzikl: 'Mjuzikl',
        koncert: 'Koncert', gostujuca_predstava: 'Gostujuća predstava', ostalo: 'Scena',
      },
      en: {
        opera: 'Opera', opereta: 'Operetta', balet: 'Ballet', drama: 'Drama', mjuzikl: 'Musical',
        koncert: 'Concert', gostujuca_predstava: 'Guest production', ostalo: 'Stage',
      },
    };

    return labels[this.publicLocale.current()][type || ''] || (this.publicLocale.isEnglish() ? 'Stage' : 'Scena');
  }

  isEnglish(): boolean {
    return this.publicLocale.isEnglish();
  }

  publicPath(srPath: string): string {
    return this.publicLocale.equivalentPath(srPath, this.publicLocale.current());
  }

  private responseRoots(response: any): any[] {
    const roots = [response];

    if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      roots.push(response.data);
    }

    return roots;
  }

  private params(values: Record<string, string | number | undefined> = {}): HttpParams {
    let params = new HttpParams().set('lang', this.publicLocale.current());
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return params;
  }
}
