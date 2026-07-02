import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicEvent } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-repertoire',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-repertoire.component.html',
  styleUrl: './public-repertoire.component.scss',
})
export class PublicRepertoireComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly events = signal<PublicEvent[]>([]);
  readonly activeType = signal('all');

  ngOnInit(): void {
    this.publicApi.getRepertoire().subscribe({
      next: (response) => {
        const events = this.publicApi.extractItems<PublicEvent>(response, ['events', 'repertoire', 'items']);

        this.events.set(
          events.sort((a, b) => {
            const left = a.startsAt ? new Date(a.startsAt).getTime() : 0;
            const right = b.startsAt ? new Date(b.startsAt).getTime() : 0;
            return left - right;
          })
        );
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Repertoar trenutno nije dostupan.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  filters(): string[] {
    const values = this.events()
      .map((event) => this.productionTypeValue(event))
      .filter(Boolean);

    return ['all', ...Array.from(new Set(values))];
  }

  setType(type: string): void {
    this.activeType.set(type);
  }

  filteredEvents(): PublicEvent[] {
    const type = this.activeType();

    if (type === 'all') {
      return this.events();
    }

    return this.events().filter((event) => this.productionTypeValue(event) === type);
  }

  eventId(event: PublicEvent): string {
    return this.publicApi.eventId(event);
  }

  production(event: PublicEvent) {
    return this.publicApi.productionFromEvent(event);
  }

  productionTitle(event: PublicEvent): string {
    return this.production(event)?.title || 'Dogadjaj';
  }

  productionSlug(event: PublicEvent): string {
    return this.production(event)?.slug || '';
  }

  productionTypeValue(event: PublicEvent): string {
    return this.production(event)?.type || '';
  }

  productionTypeLabel(event: PublicEvent): string {
    return this.publicApi.typeLabel(this.production(event)?.type);
  }

  productionImage(event: PublicEvent, index: number): string {
    return this.publicApi.mediaUrl(this.production(event)?.poster) || this.publicApi.fallbackImage(index);
  }

  dateDay(event: PublicEvent): string {
    if (!event.startsAt) {
      return '--';
    }

    return new Date(event.startsAt).toLocaleDateString('sr-RS', { day: '2-digit' });
  }

  dateMonth(event: PublicEvent): string {
    if (!event.startsAt) {
      return 'uskoro';
    }

    return new Date(event.startsAt).toLocaleDateString('sr-RS', { month: 'short' });
  }

  dateFull(event: PublicEvent): string {
    if (!event.startsAt) {
      return 'Termin ce biti objavljen';
    }

    return new Date(event.startsAt).toLocaleDateString('sr-RS', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  timeLabel(event: PublicEvent): string {
    if (!event.startsAt) {
      return '';
    }

    return new Date(event.startsAt).toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  venueName(event: PublicEvent): string {
    return event.venue?.name || event.venue?.title || 'Madlenianum';
  }

  filterLabel(type: string): string {
    return type === 'all' ? 'Sve' : this.publicApi.typeLabel(type);
  }

  canBuy(event: PublicEvent): boolean {
    const isOnSale = event.saleStatus === 'on_sale' || event.saleStatus === 'free';
    const hasTicketing = event.ticketing?.enabled !== false;

    return Boolean(this.eventId(event)) && isOnSale && hasTicketing;
  }
}
