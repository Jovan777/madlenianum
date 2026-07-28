import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicContactViewComponent } from './public-contact-view.component';
import { PublicAboutViewComponent } from './public-about-view.component';

@Component({
  selector: 'app-public-static-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicContactViewComponent, PublicAboutViewComponent],
  templateUrl: './public-static-page.component.html',
  styleUrl: './public-static-page.component.scss',
})
export class PublicStaticPageComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(true);
  readonly page = signal<any | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug') || 'o-nama';
      this.loadPage(slug);
    });
  }

  loadPage(slug: string): void {
    this.isLoading.set(true);

    this.publicApi.getPage(slug).subscribe({
      next: (response) => {
        this.page.set(this.publicApi.extractItem<any>(response, ['page', 'item']));
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
      'o-nama': 'O nama',
      kontakt: 'Kontakt',
      'plan-sedista-i-cene-karata': 'Plan sedista i cene karata',
      'knjiga-utisaka': 'Knjiga utisaka',
    };

    return titles[slug] || 'Madlenianum';
  }

  fallbackBody(slug: string): string {
    if (slug === 'kontakt') {
      return 'Blagajna i kontakt forma bice dopunjeni kroz CMS. Za sada program i kupovina koriste javni ticketing tok.';
    }

    if (slug === 'plan-sedista-i-cene-karata') {
      return 'Planovi sala, cenovne kategorije i rezervacije su povezani sa internim ticketing modulom.';
    }

    return 'Madlenianum okuplja operu, teatar, balet i koncertni program u prostoru koji spaja scensku umetnost i publiku.';
  }
}
