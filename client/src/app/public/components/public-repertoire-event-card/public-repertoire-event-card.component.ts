import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicEvent, PublicProductionCredit } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicDisplayService } from '../../shared/public-display.service';

@Component({
  selector: 'app-public-repertoire-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-repertoire-event-card.component.html',
  styleUrl: './public-repertoire-event-card.component.scss',
})
export class PublicRepertoireEventCardComponent {
  readonly event = input.required<PublicEvent>();
  readonly imageIndex = input(0);

  readonly api = inject(PublicApiService);
  readonly display = inject(PublicDisplayService);

  readonly production = computed(() => this.api.productionFromEvent(this.event()));
  readonly sale = computed(() => this.display.eventSale(this.event()));

  eventId(): string {
    return this.api.eventId(this.event());
  }

  image(): string {
    return this.api.mediaUrl(this.production()?.poster) || this.api.fallbackImage(this.imageIndex());
  }

  title(): string {
    return this.production()?.title || 'Program Madlenianuma';
  }

  slug(): string {
    return this.production()?.slug || '';
  }

  description(): string {
    return this.production()?.shortDescription || this.production()?.subtitle || '';
  }

  venue(): string {
    return this.event().venue?.name || this.event().venue?.title || 'Madlenianum';
  }

  credits(): Array<{ label: string; name: string }> {
    const production = this.production();
    const credits = production?.primaryCredits || production?.creativeTeam || [];
    const visible = credits
      .filter((credit) => ['writer', 'director'].includes(credit.roleKey || ''))
      .map((credit) => ({ label: this.creditLabel(credit), name: this.creditName(credit) }))
      .filter((credit) => credit.name)
      .slice(0, 2);

    if (!visible.some((credit) => credit.label === 'Tekst') && production?.authorComposer) {
      visible.unshift({ label: 'Tekst', name: production.authorComposer });
    }

    return visible.slice(0, 2);
  }

  private creditName(credit: PublicProductionCredit): string {
    return credit.artist?.displayName || credit.name || '';
  }

  private creditLabel(credit: PublicProductionCredit): string {
    return credit.roleKey === 'director' ? 'Režija' : 'Tekst';
  }
}
