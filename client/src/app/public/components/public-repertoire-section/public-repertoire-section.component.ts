import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicProduction } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import {
  PublicDisplayService,
  REPERTOIRE_FILTERS,
  RepertoireGroup,
} from '../../shared/public-display.service';

@Component({
  selector: 'app-public-repertoire-section',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-repertoire-section.component.html',
  styleUrl: './public-repertoire-section.component.scss',
})
export class PublicRepertoireSectionComponent {
  readonly productions = input<PublicProduction[]>([]);
  readonly heading = input('');
  readonly activeFilter = signal<RepertoireGroup>('all');
  readonly filters = REPERTOIRE_FILTERS;
  readonly display = inject(PublicDisplayService);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);
  private readonly media = inject(MediaUrlService);

  readonly visibleProductions = computed(() => {
    const active = this.activeFilter();
    return active === 'all'
      ? this.productions()
      : this.productions().filter((production) => this.display.productionGroup(production) === active);
  });

  image(production: PublicProduction): string {
    const galleryImage = production.galleryItems?.[0]?.media || production.gallery?.[0];
    return this.media.resolve(galleryImage) || this.media.resolve(production.poster);
  }

  filterLabel(value: RepertoireGroup): string {
    const keys = {
      all: 'repertoire.filters.all',
      dramski: 'repertoire.filters.drama',
      muzicki: 'repertoire.filters.music',
      gostovanja: 'repertoire.filters.guest',
    } as const;
    return this.i18n.t(keys[value]);
  }
}
