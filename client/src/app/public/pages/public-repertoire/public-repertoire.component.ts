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
        const events = this.publicApi.extractItems<PublicEvent>(response, [
          'events',
          'repertoire',
          'items',
        ]);

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
      .map((event) => this.productionType(event))
      .filter((value) => !!value);

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

    return this.events().filter((event) => this.productionType(event) === type);
  }

  eventId(event: PublicEvent): string {
    return this.publicApi.eventId(event);
  }

  productionTitle(event: PublicEvent): string {
    if (!event.production || typeof event.production === 'string') {
      return 'Događaj';
    }

    return event.production.title;
  }

  productionSlug(event: PublicEvent): string {
    if (!event.production || typeof event.production === 'string') {
      return '';
    }

    return event.production.slug;
  }

  productionType(event: PublicEvent): string {
    if (!event.production || typeof event.production === 'string') {
      return '';
    }

    return event.production.type || '';
  }

  productionImage(event: PublicEvent): string {
    if (!event.production || typeof event.production === 'string') {
      return '';
    }

    return this.publicApi.mediaUrl(event.production.poster);
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
      return 'Termin će biti objavljen';
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
    if (type === 'all') return 'Sve';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
