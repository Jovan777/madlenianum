import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { finalize } from 'rxjs';

import {
  PublicEvent,
  PublicHomeResponse,
  PublicHomepageConfig,
  PublicNews,
  PublicProduction,
  PublicPromoSlide,
} from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicCtaCardsComponent } from '../../components/public-cta-cards/public-cta-cards.component';
import { PublicFeaturedSectionComponent } from '../../components/public-featured-section/public-featured-section.component';
import { PublicHeroSliderComponent } from '../../components/public-hero-slider/public-hero-slider.component';
import { PublicInstitutionalTeaserComponent } from '../../components/public-institutional-teaser/public-institutional-teaser.component';
import { PublicNewsSectionComponent } from '../../components/public-news-section/public-news-section.component';
import { PublicRepertoireSectionComponent } from '../../components/public-repertoire-section/public-repertoire-section.component';
import { PublicUpcomingEventsComponent } from '../../components/public-upcoming-events/public-upcoming-events.component';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [
    CommonModule,
    PublicHeroSliderComponent,
    PublicUpcomingEventsComponent,
    PublicRepertoireSectionComponent,
    PublicFeaturedSectionComponent,
    PublicNewsSectionComponent,
    PublicInstitutionalTeaserComponent,
    PublicCtaCardsComponent,
  ],
  templateUrl: './public-home.component.html',
  styleUrl: './public-home.component.scss',
})
export class PublicHomeComponent implements OnInit {
  readonly loading = signal(true);
  readonly error = signal('');
  readonly config = signal<PublicHomepageConfig | null>(null);
  readonly slides = signal<PublicPromoSlide[]>([]);
  readonly events = signal<PublicEvent[]>([]);
  readonly repertoireProductions = signal<PublicProduction[]>([]);
  readonly featuredProductions = signal<PublicProduction[]>([]);
  readonly news = signal<PublicNews[]>([]);

  private readonly api = inject(PublicApiService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getHome()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.applyResponse(response),
        error: (error) => this.error.set(error?.error?.message || 'Početna strana trenutno nije dostupna.'),
      });
  }

  private applyResponse(response: PublicHomeResponse): void {
    this.config.set(response.config);
    this.slides.set(response.slides || []);
    this.events.set(response.upcomingEvents || []);
    this.repertoireProductions.set(response.repertoireProductions || []);
    this.featuredProductions.set(response.featuredProductions || []);
    this.news.set(response.featuredNews || []);
    const seo = response.config?.seo;
    this.title.setTitle(seo?.title || 'Madlenianum | Opera i teatar');
    this.meta.updateTag({ name: 'description', content: seo?.description || 'Program, predstave i ulaznice Opere i teatra Madlenianum.' });
    this.meta.updateTag({ name: 'robots', content: seo?.noIndex ? 'noindex,nofollow' : 'index,follow' });
    if (seo?.canonicalUrl) this.meta.updateTag({ property: 'og:url', content: seo.canonicalUrl });
  }
}
