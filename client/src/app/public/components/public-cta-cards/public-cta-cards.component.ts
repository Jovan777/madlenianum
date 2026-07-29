import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicHomepageCta } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { isAvailablePublicDestination, isExternalUrl } from '../../shared/public-navigation';

@Component({
  selector: 'app-public-cta-cards',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-cta-cards.component.html',
  styleUrl: './public-cta-cards.component.scss',
})
export class PublicCtaCardsComponent {
  readonly cards = input<PublicHomepageCta[]>([]);
  readonly heading = input('Partnerstvo');
  readonly media = inject(MediaUrlService);
  readonly isExternal = isExternalUrl;
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);

  internalPath(path: string): string {
    return this.locale.equivalentPath(path, this.locale.current());
  }

  readonly visibleCards = computed(() => this.cards()
    .filter((card) => card.title && card.url && isAvailablePublicDestination(card.url))
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
}
