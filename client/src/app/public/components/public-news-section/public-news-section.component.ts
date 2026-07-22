import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicNews } from '../../../core/models/public.models';
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

  readonly visibleItems = computed(() => {
    const active = this.activeFilter();
    return active === 'all'
      ? this.items()
      : this.items().filter((item) => this.display.newsGroup(item.category) === active);
  });
}
