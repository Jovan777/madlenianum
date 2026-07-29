import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PublicNews } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicDisplayService } from '../../shared/public-display.service';

@Component({
  selector: 'app-public-news',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-news.component.html',
  styleUrl: './public-news.component.scss',
})
export class PublicNewsComponent implements OnInit {
  readonly api = inject(PublicApiService);
  readonly display = inject(PublicDisplayService);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);
  readonly items = signal<PublicNews[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.api.getNews().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => this.items.set(response.items || []),
      error: (error) => this.error.set(error?.error?.message || this.i18n.t('news.error')),
    });
  }

  image(item: PublicNews): string {
    return this.api.mediaUrl(item.image);
  }
}
