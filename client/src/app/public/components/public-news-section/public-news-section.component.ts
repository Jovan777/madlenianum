import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicNews } from '../../../core/models/public.models';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { NEWS_FILTERS, NewsGroup, PublicDisplayService } from '../../shared/public-display.service';

@Component({
  selector: 'app-public-news-section',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-news-section.component.html',
  styleUrl: './public-news-section.component.scss',
})
export class PublicNewsSectionComponent {
  readonly items = input<PublicNews[]>([]);
  readonly heading = input('Iza kulisa');
  readonly activeFilter = signal<NewsGroup>('all');
  readonly filters = NEWS_FILTERS;
  readonly display = inject(PublicDisplayService);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);

  filterLabel(value: NewsGroup): string {
    const keys = {
      all: 'news.filters.all',
      press: 'news.filters.press',
      najave: 'news.filters.announcements',
      obavestenja: 'news.filters.notices',
    } as const;
    return this.i18n.t(keys[value]);
  }

  readonly visibleItems = computed(() => {
    const active = this.activeFilter();
    return active === 'all'
      ? this.items()
      : this.items().filter((item) => this.display.newsGroup(item.category) === active);
  });
}
