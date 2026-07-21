import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MediaUrlService {
  private readonly mediaBaseUrl = environment.mediaBaseUrl.replace(/\/$/, '');

  resolve(value: unknown, fallback = ''): string {
    const rawUrl = this.extractUrl(value);

    if (!rawUrl) {
      return fallback;
    }

    if (/^(https?:|data:|blob:)/i.test(rawUrl)) {
      return rawUrl;
    }

    if (!rawUrl.startsWith('/uploads/') && rawUrl !== '/uploads') {
      return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    }

    const encodedPath = rawUrl
      .split('/')
      .map((segment) => this.encodeSegment(segment))
      .join('/');

    return `${this.mediaBaseUrl}${encodedPath}`;
  }

  private extractUrl(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>;
      return String(item['url'] || '').trim();
    }

    return '';
  }

  private encodeSegment(segment: string): string {
    if (!segment) {
      return '';
    }

    try {
      return encodeURIComponent(decodeURIComponent(segment));
    } catch (_error) {
      return encodeURIComponent(segment);
    }
  }
}
