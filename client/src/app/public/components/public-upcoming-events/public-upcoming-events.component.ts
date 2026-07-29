import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicEvent, PublicProduction } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicDisplayService } from '../../shared/public-display.service';

interface EventDateGroup {
  key: string;
  label: string;
  events: PublicEvent[];
}

@Component({
  selector: 'app-public-upcoming-events',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-upcoming-events.component.html',
  styleUrl: './public-upcoming-events.component.scss',
})
export class PublicUpcomingEventsComponent {
  readonly events = input<PublicEvent[]>([]);
  readonly heading = input('');
  readonly selectedDate = signal('');
  readonly media = inject(MediaUrlService);
  readonly display = inject(PublicDisplayService);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);

  readonly groups = computed<EventDateGroup[]>(() => {
    const sorted = [...this.events()].sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
    const groups = new Map<string, EventDateGroup>();
    sorted.forEach((event) => {
      const key = this.display.dateKey(event.startsAt);
      if (!groups.has(key)) groups.set(key, { key, label: this.display.dayMonth(event.startsAt), events: [] });
      groups.get(key)?.events.push(event);
    });
    return [...groups.values()];
  });

  readonly selectedGroup = computed(() => {
    return this.groups().find((group) => group.key === this.selectedDate()) || this.groups()[0] || null;
  });

  production(event: PublicEvent): PublicProduction | null {
    return event.production && typeof event.production !== 'string' ? event.production : null;
  }

  eventId(event: PublicEvent): string {
    return String(event.id || event._id || '');
  }

  image(event: PublicEvent): string {
    return this.media.resolve(this.production(event)?.poster);
  }
}
