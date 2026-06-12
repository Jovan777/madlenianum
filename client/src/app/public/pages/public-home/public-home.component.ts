import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicEvent, PublicProduction, PublicPromoSlide } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-home.component.html',
  styleUrl: './public-home.component.scss',
})
export class PublicHomeComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly slides = signal<PublicPromoSlide[]>([]);
  readonly productions = signal<PublicProduction[]>([]);
  readonly events = signal<PublicEvent[]>([]);
  readonly news = signal<any[]>([]);
  readonly activeSlideIndex = signal(0);

  ngOnInit(): void {
    this.publicApi.getHome().subscribe({
      next: (response) => {
        const slides = this.publicApi.extractItems<PublicPromoSlide>(response, [
          'slides',
          'promoSlides',
          'promos',
        ]);
        const productions = this.publicApi.extractItems<PublicProduction>(response, [
          'productions',
          'featuredProductions',
        ]);
        const events = this.publicApi.extractItems<PublicEvent>(response, [
          'events',
          'repertoire',
          'upcomingEvents',
        ]);
        const news = this.publicApi.extractItems<any>(response, ['news', 'latestNews', 'articles']);

        this.slides.set(slides);
        this.productions.set(productions);
        this.events.set(events);
        this.news.set(news);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Početna strana trenutno nije dostupna.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  activeSlide(): PublicPromoSlide | null {
    return this.slides()[this.activeSlideIndex()] || null;
  }

  setSlide(index: number): void {
    this.activeSlideIndex.set(index);
  }

  slideImage(slide: PublicPromoSlide | null): string {
    return this.publicApi.mediaUrl(slide?.image);
  }

  heroBackground(): string {
    const image = this.slideImage(this.activeSlide());

    if (!image) {
      return '';
    }

    return `url("${image}")`;
  }

  slideProduction(slide: PublicPromoSlide | null): PublicProduction | null {
    if (!slide || !slide.production || typeof slide.production === 'string') {
      return null;
    }

    return slide.production;
  }

  slideEventId(slide: PublicPromoSlide | null): string {
    return this.publicApi.eventId(slide?.event as PublicEvent | string | null | undefined);
  }

  productionImage(production: PublicProduction): string {
    return this.publicApi.mediaUrl(production.poster);
  }

  productionDateLabel(event: PublicEvent): string {
    if (!event.startsAt) {
      return 'Uskoro';
    }

    return new Date(event.startsAt).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: 'long',
    });
  }

  productionTitleFromEvent(event: PublicEvent): string {
    if (!event.production || typeof event.production === 'string') {
      return 'Događaj';
    }

    return event.production.title;
  }

  productionTypeFromEvent(event: PublicEvent): string {
    if (!event.production || typeof event.production === 'string') {
      return '';
    }

    return event.production.type || '';
  }

  eventId(event: PublicEvent): string {
    return this.publicApi.eventId(event);
  }

  eventProductionSlug(event: PublicEvent): string {
    if (!event.production || typeof event.production === 'string') {
      return '';
    }

    return event.production.slug;
  }
}
