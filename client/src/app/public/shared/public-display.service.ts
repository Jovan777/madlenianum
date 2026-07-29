import { Injectable } from '@angular/core';

import {
  PublicEvent,
  PublicProduction,
  PublicSaleAvailability,
} from '../../core/models/public.models';
import { PublicLocaleService } from '../../core/services/public-locale.service';

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

const PRODUCTION_TYPES_SR: Record<string, string> = {
  opera: 'Opera',
  opereta: 'Opereta',
  balet: 'Balet',
  drama: 'Drama',
  mjuzikl: 'Mjuzikl',
  koncert: 'Koncert',
  gostujuca_predstava: 'Gostujuća predstava',
  ostalo: 'Program',
};

const PRODUCTION_TYPES_EN: Record<string, string> = {
  opera: 'Opera', opereta: 'Operetta', balet: 'Ballet', drama: 'Drama', mjuzikl: 'Musical',
  koncert: 'Concert', gostujuca_predstava: 'Guest production', ostalo: 'Programme',
};

const NEWS_LABELS_SR: Record<string, string> = {
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

const NEWS_LABELS_EN: Record<string, string> = {
  vest: 'News', kritika: 'Review', press: 'Press', akcija: 'Promotion', premijera: 'Premiere',
  najava: 'Announcement', obavestenje: 'Notice', promocija: 'Promotion', ostalo: 'Latest',
};

@Injectable({ providedIn: 'root' })
export class PublicDisplayService {
  readonly timeZone = 'Europe/Belgrade';

  constructor(private readonly locale: PublicLocaleService) {}

  productionType(value: string | undefined): string {
    const labels = this.locale.isEnglish() ? PRODUCTION_TYPES_EN : PRODUCTION_TYPES_SR;
    return labels[value || ''] || (this.locale.isEnglish() ? 'Programme' : 'Program');
  }

  productionGroup(production: PublicProduction): RepertoireGroup {
    if (production.type === 'drama') return 'dramski';
    if (['opera', 'opereta', 'balet', 'mjuzikl', 'koncert'].includes(production.type || '')) return 'muzicki';
    if (production.type === 'gostujuca_predstava') return 'gostovanja';
    return 'all';
  }

  newsCategory(value: string | undefined): string {
    const labels = this.locale.isEnglish() ? NEWS_LABELS_EN : NEWS_LABELS_SR;
    return labels[value || ''] || (this.locale.isEnglish() ? 'Latest' : 'Aktuelno');
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
    const label = (sr: string, en: string) => this.locale.isEnglish() ? en : sr;
    if (event.status === 'cancelled') return { state: 'cancelled', canPurchase: false, label: label('Otkazano', 'Cancelled') };
    if (event.status === 'postponed') return { state: 'postponed', canPurchase: false, label: label('Odloženo', 'Postponed') };
    if (['completed', 'finished', 'archived'].includes(event.status || '') || (startsAt > 0 && startsAt <= now)) return { state: 'finished', canPurchase: false, label: label('Događaj je završen', 'Event has ended') };
    if (event.saleStatus === 'sold_out') return { state: 'sold_out', canPurchase: false, label: label('Rasprodato', 'Sold out') };
    if (['closed', 'sales_closed'].includes(event.saleStatus || '') || (saleEndsAt > 0 && saleEndsAt <= now)) return { state: 'closed', canPurchase: false, label: label('Prodaja završena', 'Sales closed') };
    if (event.saleStatus === 'free') return { state: 'free', canPurchase: false, label: label('Slobodan ulaz', 'Free admission') };
    if (['not_started', 'not_on_sale'].includes(event.saleStatus || '') || (saleStartsAt > now)) return { state: 'upcoming', canPurchase: false, label: label('Prodaja uskoro', 'On sale soon') };
    const canPurchase = event.saleStatus === 'on_sale'
      && event.ticketing?.enabled === true
      && event.ticketing?.provider === 'internal'
      && Boolean(event.seatMap)
      && Boolean(event.pricePlan);
    return canPurchase
      ? { state: 'on_sale', canPurchase: true, label: label('Kupi karte', 'Buy tickets') }
      : { state: 'unavailable', canPurchase: false, label: label('Prodaja nije dostupna', 'Sales unavailable') };
  }

  dateKey(value: string | undefined): string {
    if (!value) return '';
    return this.formatParts(value).map((part) => `${part.type}:${part.value}`).join('|');
  }

  dayMonth(value: string | undefined): string {
    if (!value) return this.locale.isEnglish() ? 'Coming soon' : 'Uskoro';
    return new Intl.DateTimeFormat(this.dateLocale(), {
      day: 'numeric',
      month: 'short',
      timeZone: this.timeZone,
    }).format(new Date(value));
  }

  fullDate(value: string | undefined): string {
    if (!value) return '';
    return new Intl.DateTimeFormat(this.dateLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: this.timeZone,
    }).format(new Date(value));
  }

  time(value: string | undefined): string {
    if (!value) return '';
    return new Intl.DateTimeFormat(this.dateLocale(), {
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

  private dateLocale(): string {
    return this.locale.isEnglish() ? 'en-GB' : 'sr-Latn-RS';
  }
}
