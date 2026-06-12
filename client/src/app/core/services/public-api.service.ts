import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  EventSeatsResponse,
  PublicEvent,
  PublicListResponse,
  PublicProduction,
} from '../models/public.models';

const PUBLIC_SESSION_KEY = 'madlenianum_public_session_id';

@Injectable({
  providedIn: 'root',
})
export class PublicApiService {
  private readonly apiUrl = environment.apiUrl;
  private readonly backendUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  constructor(private readonly http: HttpClient) {}

  getHome() {
    return this.http.get<any>(`${this.apiUrl}/public/home`);
  }

  getRepertoire() {
    return this.http.get<any>(`${this.apiUrl}/public/repertoire`);
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
    if (!value) {
      return '';
    }

    let url = '';

    if (typeof value === 'string') {
      url = value;
    } else if (typeof value === 'object') {
      const item = value as any;
      url = item.url || item.path || '';
    }

    if (!url) {
      return '';
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    if (url.startsWith('/')) {
      return `${this.backendUrl}${url}`;
    }

    return `${this.backendUrl}/${url}`;
  }

  extractItems<T>(response: any, keys: string[] = []): T[] {
    if (!response) {
      return [];
    }

    for (const key of keys) {
      if (Array.isArray(response[key])) {
        return response[key] as T[];
      }
    }

    if (Array.isArray(response.items)) {
      return response.items as T[];
    }

    if (Array.isArray(response.data)) {
      return response.data as T[];
    }

    return [];
  }

  extractItem<T>(response: any, keys: string[] = []): T | null {
    if (!response) {
      return null;
    }

    for (const key of keys) {
      if (response[key]) {
        return response[key] as T;
      }
    }

    return (response.item || response.production || response.data || null) as T | null;
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
}
