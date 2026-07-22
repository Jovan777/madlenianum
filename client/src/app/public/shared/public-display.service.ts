import { Injectable } from '@angular/core';

import {
  PublicEvent,
  PublicProduction,
  PublicSaleAvailability,
} from '../../core/models/public.models';

export type RepertoireGroup = 'all' | 'dramski' | 'muzicki' | 'gostovanja';
export type NewsGroup = 'all' | 'press' | 'najave' | 'obavestenja';

export const REPERTOIRE_FILTERS: Array<{ value: RepertoireGroup; label: string }> = [
  { value: 'all', label: 'Sve' },
  { value: 'dramski', label: 'Dramski' },
  { value: 'muzicki', label: 'Muzički' },
  { value: 'gostovanja', label: 'Gostovanja' },
];

export const NEWS_FILTERS: Array<{ value: NewsGroup; label: string }> = [
  { value: 'all', label: 'Sve' },
  { value: 'press', label: 'Press' },
  { value: 'najave', label: 'Najave' },
  { value: 'obavestenja', label: 'Obaveštenja' },
];

const PRODUCTION_TYPES: Record<string, string> = {
  opera: 'Opera',
  opereta: 'Opereta',
  balet: 'Balet',
  drama: 'Drama',
  mjuzikl: 'Mjuzikl',
  koncert: 'Koncert',
  gostujuca_predstava: 'Gostujuća predstava',
  ostalo: 'Program',
};

const NEWS_LABELS: Record<string, string> = {
  vest: 'Vest',
  kritika: 'Kritika',
  press: 'Press',
  akcija: 'Akcija',
  premijera: 'Premijera',
  najava: 'Najava',
  obavestenje: 'Obaveštenje',
  promocija: 'Promocija',
  ostalo: 'Aktuelno',
};

@Injectable({ providedIn: 'root' })
export class PublicDisplayService {
  readonly timeZone = 'Europe/Belgrade';

  productionType(value: string | undefined): string {
    return PRODUCTION_TYPES[value || ''] || 'Program';
  }

  productionGroup(production: PublicProduction): RepertoireGroup {
    if (production.type === 'drama') return 'dramski';
    if (['opera', 'opereta', 'balet', 'mjuzikl', 'koncert'].includes(production.type || '')) return 'muzicki';
    if (production.type === 'gostujuca_predstava') return 'gostovanja';
    return 'all';
  }

  newsCategory(value: string | undefined): string {
    return NEWS_LABELS[value || ''] || 'Aktuelno';
  }

  newsGroup(value: string | undefined): NewsGroup {
    if (value === 'press' || value === 'kritika') return 'press';
    if (['najava', 'premijera', 'promocija', 'akcija'].includes(value || '')) return 'najave';
    if (['obavestenje', 'vest', 'ostalo'].includes(value || '')) return 'obavestenja';
    return 'all';
  }

  eventSale(event: PublicEvent): PublicSaleAvailability {
    if (event.saleAvailability) return event.saleAvailability;

    const now = Date.now();
    const startsAt = event.startsAt ? new Date(event.startsAt).getTime() : 0;
    const saleStartsAt = event.saleStartsAt ? new Date(event.saleStartsAt).getTime() : 0;
    const saleEndsAt = event.saleEndsAt ? new Date(event.saleEndsAt).getTime() : 0;
    if (event.status === 'cancelled') return { state: 'cancelled', canPurchase: false, label: 'Otkazano' };
    if (event.status === 'postponed') return { state: 'postponed', canPurchase: false, label: 'Odloženo' };
    if (event.status === 'finished' || (startsAt > 0 && startsAt <= now)) return { state: 'finished', canPurchase: false, label: 'Događaj je završen' };
    if (event.saleStatus === 'sold_out') return { state: 'sold_out', canPurchase: false, label: 'Rasprodato' };
    if (event.saleStatus === 'sales_closed' || (saleEndsAt > 0 && saleEndsAt <= now)) return { state: 'closed', canPurchase: false, label: 'Prodaja završena' };
    if (event.saleStatus === 'free') return { state: 'free', canPurchase: false, label: 'Slobodan ulaz' };
    if (event.saleStatus === 'not_on_sale' || (saleStartsAt > now)) return { state: 'upcoming', canPurchase: false, label: 'Prodaja uskoro' };
    const canPurchase = event.saleStatus === 'on_sale'
      && event.ticketing?.enabled === true
      && event.ticketing?.provider === 'internal'
      && Boolean(event.seatMap)
      && Boolean(event.pricePlan);
    return canPurchase
      ? { state: 'on_sale', canPurchase: true, label: 'Kupi karte' }
      : { state: 'unavailable', canPurchase: false, label: 'Prodaja nije dostupna' };
  }

  dateKey(value: string | undefined): string {
    if (!value) return '';
    return this.formatParts(value).map((part) => `${part.type}:${part.value}`).join('|');
  }

  dayMonth(value: string | undefined): string {
    if (!value) return 'Uskoro';
    return new Intl.DateTimeFormat('sr-Latn-RS', {
      day: 'numeric',
      month: 'short',
      timeZone: this.timeZone,
    }).format(new Date(value));
  }

  fullDate(value: string | undefined): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('sr-Latn-RS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: this.timeZone,
    }).format(new Date(value));
  }

  time(value: string | undefined): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('sr-Latn-RS', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: this.timeZone,
    }).format(new Date(value));
  }

  private formatParts(value: string): Intl.DateTimeFormatPart[] {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: this.timeZone,
    }).formatToParts(new Date(value));
  }
}
