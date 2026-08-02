import { describe, expect, it } from 'vitest';

import { MediaUrlService } from './media-url.service';

describe('MediaUrlService', () => {
  const service = new MediaUrlService();

  it('returns the configured fallback when media is missing', () => {
    expect(service.resolve(null, '/images/fallback.jpg')).toBe('/images/fallback.jpg');
  });

  it('preserves absolute and browser-managed URLs', () => {
    expect(service.resolve('https://cdn.example.com/poster.jpg')).toBe(
      'https://cdn.example.com/poster.jpg',
    );
    expect(service.resolve('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('normalizes and safely encodes uploaded media paths', () => {
    expect(service.resolve('/uploads/madlenianum/Nova slika.jpg')).toMatch(
      /\/uploads\/madlenianum\/Nova%20slika\.jpg$/,
    );
    expect(service.resolve({ url: '/uploads/madlenianum/Nova%20slika.jpg' })).toMatch(
      /\/uploads\/madlenianum\/Nova%20slika\.jpg$/,
    );
  });
});
