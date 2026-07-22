import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

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

    this.publicApi.getProduction(slug).subscribe({
      next: (response) => {
        const item = this.publicApi.extractItem<PublicProduction>(response, ['production', 'item']);
        this.production.set(item);
        this.events.set(this.publicApi.extractItems<PublicEvent>(response, ['upcomingEvents', 'events']));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Predstava trenutno nije dostupna.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  image(value: unknown, fallbackIndex = 0): string {
    return this.publicApi.mediaUrl(value) || this.publicApi.fallbackImage(fallbackIndex);
  }

  gallery(production: PublicProduction): unknown[] {
    return production.gallery || [];
  }

  eventId(event: PublicEvent): string {
    return this.publicApi.eventId(event);
  }

  eventDate(event: PublicEvent): string {
    if (!event.startsAt) {
      return 'Termin ce biti objavljen';
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

  venueName(event: PublicEvent): string {
    return event.venue?.name || event.venue?.title || 'Madlenianum';
  }

  typeLabel(production: PublicProduction): string {
    return this.publicApi.typeLabel(production.type);
  }

  metaItems(production: PublicProduction): string[] {
    return [
      production.authorComposer,
      production.season,
      production.durationMinutes ? `${production.durationMinutes} min` : '',
      production.performanceLanguage,
      production.subtitles ? `Titl: ${production.subtitles}` : '',
    ].filter(Boolean) as string[];
  }

  castNames(item: any): string {
    if (item.name) {
      return item.name;
    }

    if (Array.isArray(item.names) && item.names.length > 0) {
      return item.names.join(', ');
    }

    if (Array.isArray(item.artists) && item.artists.length > 0) {
      return item.artists.map((artist: any) => artist.displayName || artist.name || artist).join(', ');
    }

    return '-';
  }

  creditName(member: any): string {
    return member.name || member.artist?.displayName || member.artist?.name || '-';
  }
}
