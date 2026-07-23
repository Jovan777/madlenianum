import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicEvent } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-ticket-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-ticket-event-card.component.html',
  styleUrl: './public-ticket-event-card.component.scss',
})
export class PublicTicketEventCardComponent {
  readonly publicApi = inject(PublicApiService);

  @Input({ required: true }) event!: PublicEvent;

  productionTitle(): string {
    return this.publicApi.productionFromEvent(this.event)?.title || 'Događaj';
  }

  productionType(): string {
    return this.publicApi.typeLabel(this.publicApi.productionFromEvent(this.event)?.type);
  }

  imageUrl(): string {
    const production = this.publicApi.productionFromEvent(this.event);
    return this.publicApi.mediaUrl(production?.poster) || this.publicApi.fallbackImage(1);
  }

  eventDate(): string {
    if (!this.event.startsAt) return 'Termin će biti objavljen';

    return new Intl.DateTimeFormat('sr-Latn-RS', {
      timeZone: 'Europe/Belgrade',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(this.event.startsAt));
  }

  venueName(): string {
    return this.event.venue?.name || this.event.venue?.title || 'Madlenianum';
  }

  statusLabel(): string {
    const labels: Record<string, string> = {
      draft: 'Nacrt',
      scheduled: 'Zakazano',
      completed: 'Završeno',
      cancelled: 'Otkazano',
      postponed: 'Odloženo',
    };
    return labels[this.event.status || ''] || '';
  }
}
