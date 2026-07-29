import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';

import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicContactViewComponent } from './public-contact-view.component';
import { PublicAboutViewComponent } from './public-about-view.component';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';

@Component({
  selector: 'app-public-static-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicContactViewComponent, PublicAboutViewComponent, PublicTranslatePipe],
  templateUrl: './public-static-page.component.html',
  styleUrl: './public-static-page.component.scss',
})
export class PublicStaticPageComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly locale = inject(PublicLocaleService);

  readonly isLoading = signal(true);
  readonly page = signal<any | null>(null);

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.data]).pipe(
      map(([params, data]) => data['staticSlug'] || params.get('slug') || 'o-nama'),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((slug) => this.loadPage(slug));
  }

  loadPage(slug: string): void {
    this.isLoading.set(true);
    this.page.set(null);

    this.publicApi.getPage(slug).subscribe({
      next: (response) => {
        const item = this.publicApi.extractItem<any>(response, ['page', 'item']);
        this.page.set(item);
        if (item) {
          const srSlug = item.slugs?.sr || item.slug || slug;
          const enSlug = item.slugs?.en;
          const isAbout = item.pageType === 'about' || srSlug === 'o-nama';
          const isContact = item.pageType === 'contact' || srSlug === 'kontakt';
          this.locale.registerPageLinks({
            sr: `/strana/${srSlug}`,
            en: isAbout ? '/en/about' : isContact ? '/en/contact' : enSlug ? `/en/page/${enSlug}` : '/en',
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.page.set({
          title: this.fallbackTitle(slug),
          body: this.fallbackBody(slug),
          slug,
        });
        this.isLoading.set(false);
      },
    });
  }

  image(page: any): string {
    return this.publicApi.mediaUrl(page?.image) || this.publicApi.fallbackImage(2);
  }

  content(page: any): string {
    return page.content || page.body || page.excerpt || '';
  }

  isContact(page: any): boolean {
    return page.slug === 'kontakt' || page.pageType === 'contact';
  }

  isAbout(page: any): boolean {
    return page.slug === 'o-nama' || page.pageType === 'about';
  }

  fallbackTitle(slug: string): string {
    const titles: Record<string, string> = {
      'o-nama': this.locale.isEnglish() ? 'About us' : 'O nama',
      kontakt: this.locale.isEnglish() ? 'Contact' : 'Kontakt',
      'plan-sedista-i-cene-karata': this.locale.isEnglish() ? 'Seating plan and ticket prices' : 'Plan sedišta i cene karata',
      'knjiga-utisaka': this.locale.isEnglish() ? 'Guest book' : 'Knjiga utisaka',
    };

    return titles[slug] || 'Madlenianum';
  }

  fallbackBody(slug: string): string {
    if (slug === 'kontakt') {
      return this.locale.isEnglish() ? 'Contact information will be available soon.' : 'Blagajna i kontakt forma biće dopunjeni kroz CMS.';
    }

    if (slug === 'plan-sedista-i-cene-karata') {
      return this.locale.isEnglish() ? 'Seating plans, price categories and reservations are connected to the ticketing system.' : 'Planovi sala, cenovne kategorije i rezervacije su povezani sa internim ticketing modulom.';
    }

    return this.locale.isEnglish() ? 'Madlenianum brings opera, theatre, ballet and concerts together in a space connecting stage art and its audience.' : 'Madlenianum okuplja operu, teatar, balet i koncertni program u prostoru koji spaja scensku umetnost i publiku.';
  }
}
