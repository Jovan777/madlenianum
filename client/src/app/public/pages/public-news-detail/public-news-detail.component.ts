import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, finalize, map, switchMap, tap } from 'rxjs';

import { PublicGalleryItem, PublicNews } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicGalleryLightboxComponent } from '../../components/public-gallery-lightbox/public-gallery-lightbox.component';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';
import { PublicDisplayService } from '../../shared/public-display.service';

@Component({
  selector: 'app-public-news-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicGalleryLightboxComponent, PublicTranslatePipe],
  templateUrl: './public-news-detail.component.html',
  styleUrl: './public-news-detail.component.scss',
})
export class PublicNewsDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly api = inject(PublicApiService);
  readonly display = inject(PublicDisplayService);
  readonly locale = inject(PublicLocaleService);
  private readonly i18n = inject(PublicI18nService);
  readonly item = signal<PublicNews | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly lightbox = signal<PublicGalleryItem[] | null>(null);

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params) => params.get('slug') || ''),
      distinctUntilChanged(),
      tap(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        this.loading.set(true);
        this.error.set('');
        this.item.set(null);
        this.lightbox.set(null);
      }),
      switchMap((slug) => this.api.getNewsItem(slug).pipe(
        catchError((error) => {
          this.error.set(error?.error?.message || this.i18n.t('news.notFound'));
          return EMPTY;
        }),
        finalize(() => this.loading.set(false))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((response) => {
        this.item.set(response.item);
        this.locale.registerPageLinks({
          sr: `/vesti/${response.item.slugs?.sr || response.item.slug}`,
          en: response.item.slugs?.en ? `/en/news/${response.item.slugs.en}` : '/en/news',
        });
    });
  }

  image(value: unknown): string { return this.api.mediaUrl(value); }
  heroImage(item: PublicNews): string { return this.image(item.image) || '/madlenianum/madlenianum_zgrada.jpg'; }
  openGallery(index: number): void {
    const gallery = this.item()?.galleryItems || [];
    if (!gallery.length) return;
    this.lightbox.set([...gallery.slice(index), ...gallery.slice(0, index)]);
  }
}
