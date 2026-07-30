import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';

import { PublicEvent } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';

@Component({
  selector: 'app-public-ticket-event-card',
  standalone: true,
  imports: [CommonModule, PublicTranslatePipe],
  templateUrl: './public-ticket-event-card.component.html',
  styleUrl: './public-ticket-event-card.component.scss',
})
export class PublicTicketEventCardComponent {
  readonly publicApi = inject(PublicApiService);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);

  @Input({ required: true }) event!: PublicEvent;

  productionTitle(): string {
    return this.publicApi.productionFromEvent(this.event)?.title || this.i18n.t('ticketing.event');
  }

  productionType(): string {
    return this.publicApi.typeLabel(this.publicApi.productionFromEvent(this.event)?.type);
  }

  imageUrl(): string {
    const production = this.publicApi.productionFromEvent(this.event);
    return this.publicApi.mediaUrl(production?.poster) || this.publicApi.fallbackImage(1);
  }

  eventDay(): string {
    if (!this.event.startsAt) return this.i18n.t('event.dateSoon');
    return new Intl.DateTimeFormat(this.locale.isEnglish() ? 'en-GB' : 'sr-Latn-RS', {
      timeZone: 'Europe/Belgrade',
      day: '2-digit',
      month: 'short',
    }).format(new Date(this.event.startsAt));
  }

  eventTime(): string {
    if (!this.event.startsAt) return '--:--';
    return new Intl.DateTimeFormat(this.locale.isEnglish() ? 'en-GB' : 'sr-Latn-RS', {
      timeZone: 'Europe/Belgrade',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(this.event.startsAt));
  }

  venueName(): string {
    return this.event.venue?.name || this.event.venue?.title || 'Madlenianum';
  }
}
