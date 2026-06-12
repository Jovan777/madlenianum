import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { PublicEvent, PublicProduction } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-production-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-production-detail.component.html',
  styleUrl: './public-production-detail.component.scss',
})
export class PublicProductionDetailComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly production = signal<PublicProduction | null>(null);
  readonly events = signal<PublicEvent[]>([]);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';

    forkJoin({
      production: this.publicApi.getProduction(slug),
      repertoire: this.publicApi.getRepertoire(),
    }).subscribe({
      next: ({ production, repertoire }) => {
        const item = this.publicApi.extractItem<PublicProduction>(production, ['production']);
        this.production.set(item);

        const allEvents = this.publicApi.extractItems<PublicEvent>(repertoire, [
          'events',
          'repertoire',
          'items',
        ]);

        this.events.set(
          allEvents.filter((event) => {
            if (!event.production || typeof event.production === 'string') {
              return false;
            }

            return event.production.slug === slug;
          })
        );
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Predstava trenutno nije dostupna.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  image(value: unknown): string {
    return this.publicApi.mediaUrl(value);
  }

  gallery(production: PublicProduction): unknown[] {
    return production.gallery || [];
  }

  eventId(event: PublicEvent): string {
    return this.publicApi.eventId(event);
  }

  eventDate(event: PublicEvent): string {
    if (!event.startsAt) {
      return 'Termin će biti objavljen';
    }

    return new Date(event.startsAt).toLocaleString('sr-RS', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  castNames(item: any): string {
    if (Array.isArray(item.names) && item.names.length > 0) {
      return item.names.join(', ');
    }

    if (Array.isArray(item.artists) && item.artists.length > 0) {
      return item.artists.map((artist: any) => artist.displayName || artist.name || artist).join(', ');
    }

    return '-';
  }
}
