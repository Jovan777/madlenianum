import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
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
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicSeoService } from '../../../core/services/public-seo.service';
import { PublicCtaCardsComponent } from '../../components/public-cta-cards/public-cta-cards.component';
import { PublicFeaturedSectionComponent } from '../../components/public-featured-section/public-featured-section.component';
import { PublicHeroSliderComponent } from '../../components/public-hero-slider/public-hero-slider.component';
import { PublicInstitutionalTeaserComponent } from '../../components/public-institutional-teaser/public-institutional-teaser.component';
import { PublicNewsSectionComponent } from '../../components/public-news-section/public-news-section.component';
import { PublicRepertoireSectionComponent } from '../../components/public-repertoire-section/public-repertoire-section.component';
import { PublicUpcomingEventsComponent } from '../../components/public-upcoming-events/public-upcoming-events.component';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';

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
    PublicTranslatePipe,
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
  private readonly i18n = inject(PublicI18nService);
  private readonly locale = inject(PublicLocaleService);
  private readonly seo = inject(PublicSeoService);

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
        error: (error) => this.error.set(error?.error?.message || this.i18n.t('home.unavailable')),
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
    this.seo.update(
      seo,
      this.locale.isEnglish() ? 'Madlenianum | Opera & Theatre' : 'Madlenianum | Opera i teatar',
      this.locale.isEnglish()
        ? 'Programme, productions and tickets for Madlenianum Opera & Theatre.'
        : 'Program, predstave i ulaznice Opere i teatra Madlenianum.',
      { sr: '/', en: '/en' }
    );
  }
}
