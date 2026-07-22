import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { MediaUrlService } from './media-url.service';
import {
  EventSeatsResponse,
  PublicHomeResponse,
  PublicEvent,
  PublicListResponse,
  PublicProduction,
  PublicRepertoireResponse,
  PublicSiteSettings,
} from '../models/public.models';

const PUBLIC_SESSION_KEY = 'madlenianum_public_session_id';

@Injectable({
  providedIn: 'root',
})
export class PublicApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly mediaUrls: MediaUrlService
  ) {}

  getHome() {
    return this.http.get<PublicHomeResponse>(`${this.apiUrl}/public/home`);
  }

  getSiteSettings() {
    return this.http.get<{ success: boolean; item: PublicSiteSettings }>(`${this.apiUrl}/public/site-settings`);
  }

  getRepertoire(filters: { month?: number; year?: number; view?: 'current' | 'announced' | 'archive' } = {}) {
    let params = new HttpParams();

    if (filters.month) params = params.set('month', String(filters.month));
    if (filters.year) params = params.set('year', String(filters.year));
    if (filters.view && filters.view !== 'current') params = params.set('view', filters.view);

    return this.http.get<PublicRepertoireResponse>(`${this.apiUrl}/public/repertoire`, { params });
  }

  getProductions() {
    return this.http.get<PublicListResponse<PublicProduction>>(`${this.apiUrl}/public/productions`);
  }

  getProduction(slug: string) {
    return this.http.get<any>(`${this.apiUrl}/public/productions/${slug}`);
  }

  getArtists() {
    return this.http.get<any>(`${this.apiUrl}/public/artists`);
  }

  getArtist(slug: string) {
    return this.http.get<any>(`${this.apiUrl}/public/artists/${slug}`);
  }

  getPage(slug: string) {
    return this.http.get<any>(`${this.apiUrl}/public/pages/${slug}`);
  }

  getEventSeats(eventId: string) {
    return this.http.get<EventSeatsResponse>(`${this.apiUrl}/public/events/${eventId}/seats`);
  }

  lockSeats(eventId: string, seatIds: string[]) {
    return this.http.post<any>(`${this.apiUrl}/public/events/${eventId}/seats/lock`, {
      sessionId: this.getSessionId(),
      seatIds,
    });
  }

  releaseSeats(eventId: string, seatIds: string[]) {
    return this.http.post<any>(`${this.apiUrl}/public/events/${eventId}/seats/release`, {
      sessionId: this.getSessionId(),
      seatIds,
    });
  }

  createGuestOrder(payload: {
    eventId: string;
    seatIds: string[];
    customerSnapshot: {
      fullName: string;
      email: string;
      phone: string;
      address: string;
      postalCode: string;
      city: string;
      country: string;
    };
  }) {
    return this.http.post<any>(`${this.apiUrl}/public/orders`, {
      ...payload,
      sessionId: this.getSessionId(),
    });
  }

  getPublicOrder(identifier: string) {
    const sessionId = encodeURIComponent(this.getSessionId());
    return this.http.get<any>(`${this.apiUrl}/public/orders/${identifier}?sessionId=${sessionId}`);
  }

  subscribeNewsletter(email: string) {
    return this.http.post<any>(`${this.apiUrl}/public/newsletter/subscribe`, {
      email,
      language: 'sr',
    });
  }

  sendContactMessage(payload: Record<string, string>) {
    return this.http.post<any>(`${this.apiUrl}/public/contact`, payload);
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
    const labels: Record<string, string> = {
      opera: 'Opera',
      opereta: 'Opereta',
      balet: 'Balet',
      drama: 'Drama',
      mjuzikl: 'Mjuzikl',
      koncert: 'Koncert',
      gostujuca_predstava: 'Gostujuca predstava',
      ostalo: 'Scena',
    };

    return labels[type || ''] || 'Scena';
  }

  private responseRoots(response: any): any[] {
    const roots = [response];

    if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      roots.push(response.data);
    }

    return roots;
  }
}
