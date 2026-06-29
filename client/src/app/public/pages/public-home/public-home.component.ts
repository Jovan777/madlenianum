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
        this.slides.set(
          this.publicApi.extractItems<PublicPromoSlide>(response, ['slides', 'promoSlides', 'promos'])
        );
        this.productions.set(
          this.publicApi.extractItems<PublicProduction>(response, [
            'featuredProductions',
            'productions',
          ])
        );
        this.events.set(
          this.publicApi.extractItems<PublicEvent>(response, [
            'upcomingEvents',
            'events',
            'repertoire',
          ])
        );
        this.news.set(this.publicApi.extractItems<any>(response, ['featuredNews', 'news', 'articles']));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Pocetna strana trenutno nije dostupna.');
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

  heroTitle(): string {
    return this.activeSlide()?.title || this.productions()[0]?.title || 'Madlenianum';
  }

  heroSubtitle(): string {
    return (
      this.activeSlide()?.description ||
      this.activeSlide()?.subtitle ||
      this.productions()[0]?.shortDescription ||
      'Opera, teatar i balet sa jasnim putem od programa do karte.'
    );
  }

  heroImage(): string {
    const slide = this.activeSlide();
    const production = this.slideProduction(slide) || this.productions()[0];

    return (
      this.publicApi.mediaUrl(slide?.image) ||
      this.publicApi.mediaUrl(production?.poster) ||
      this.publicApi.fallbackImage(0)
    );
  }

  heroBackground(): string {
    return `url("${this.heroImage()}")`;
  }

  slideProduction(slide: PublicPromoSlide | null): PublicProduction | null {
    const value = slide?.relatedProduction || slide?.production;

    if (!value || typeof value === 'string') {
      return null;
    }

    return value;
  }

  heroProductionSlug(): string {
    return this.slideProduction(this.activeSlide())?.slug || this.productions()[0]?.slug || '';
  }

  heroEventId(): string {
    const slideEvent = this.publicApi.eventId(this.activeSlide()?.event as PublicEvent | string | null | undefined);

    if (slideEvent) {
      return slideEvent;
    }

    const productionSlug = this.heroProductionSlug();
    const matchingEvent = this.events().find((event) => {
      return this.publicApi.productionFromEvent(event)?.slug === productionSlug;
    });

    return this.publicApi.eventId(matchingEvent || this.events()[0]);
  }

  eventId(event: PublicEvent): string {
    return this.publicApi.eventId(event);
  }

  eventProduction(event: PublicEvent): PublicProduction | null {
    return this.publicApi.productionFromEvent(event);
  }

  eventTitle(event: PublicEvent): string {
    return this.eventProduction(event)?.title || 'Dogadjaj';
  }

  eventType(event: PublicEvent): string {
    return this.publicApi.typeLabel(this.eventProduction(event)?.type);
  }

  eventDate(event: PublicEvent): string {
    if (!event.startsAt) {
      return 'Uskoro';
    }

    return new Date(event.startsAt).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: 'long',
    });
  }

  eventTime(event: PublicEvent): string {
    if (!event.startsAt) {
      return '';
    }

    return new Date(event.startsAt).toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  venueName(event: PublicEvent): string {
    return event.venue?.name || event.venue?.title || 'Madlenianum';
  }

  productionImage(production: PublicProduction, index: number): string {
    return this.publicApi.mediaUrl(production.poster) || this.publicApi.fallbackImage(index);
  }

  productionType(production: PublicProduction): string {
    return this.publicApi.typeLabel(production.type);
  }

  newsTitle(item: any): string {
    return item.title || item.headline || 'Vest';
  }
}
