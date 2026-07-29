import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicEvent, PublicProduction, PublicPromoSlide } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicDisplayService } from '../../shared/public-display.service';

@Component({
  selector: 'app-public-hero-slider',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-hero-slider.component.html',
  styleUrl: './public-hero-slider.component.scss',
})
export class PublicHeroSliderComponent {
  readonly slides = input<PublicPromoSlide[]>([]);
  readonly fallbackProduction = input<PublicProduction | null>(null);
  readonly activeIndex = signal(0);
  readonly imageFailed = signal(false);
  readonly media = inject(MediaUrlService);
  readonly display = inject(PublicDisplayService);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);

  readonly activeSlide = computed(() => this.slides()[this.activeIndex()] || null);
  readonly production = computed(() => {
    const value = this.activeSlide()?.relatedProduction || this.activeSlide()?.production;
    return value && typeof value !== 'string' ? value : this.fallbackProduction();
  });
  readonly event = computed<PublicEvent | null>(() => {
    const value = this.activeSlide()?.relatedEvent || this.activeSlide()?.event;
    return value && typeof value !== 'string' ? value : null;
  });
  readonly sale = computed(() => this.event() ? this.display.eventSale(this.event()!) : null);
  readonly imageUrl = computed(() => {
    if (this.imageFailed()) return '';
    return this.media.resolve(this.activeSlide()?.image)
      || this.media.resolve(this.production()?.poster);
  });

  title(): string {
    return this.activeSlide()?.title || this.production()?.title || 'Madlenianum';
  }

  description(): string {
    return this.activeSlide()?.description
      || this.activeSlide()?.subtitle
      || this.production()?.shortDescription
      || '';
  }

  imageAlt(): string {
    const image = this.activeSlide()?.image;
    return image && typeof image !== 'string' ? image.altText || image.alt || this.title() : this.title();
  }

  eventId(): string {
    return String(this.event()?.id || this.event()?._id || '');
  }

  setSlide(index: number): void {
    if (!this.slides().length) return;
    this.activeIndex.set((index + this.slides().length) % this.slides().length);
    this.imageFailed.set(false);
  }

  previous(): void {
    this.setSlide(this.activeIndex() - 1);
  }

  next(): void {
    this.setSlide(this.activeIndex() + 1);
  }

  @HostListener('keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }
}
