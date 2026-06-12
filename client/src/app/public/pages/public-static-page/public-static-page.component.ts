import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-static-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-static-page.component.html',
  styleUrl: './public-static-page.component.scss',
})
export class PublicStaticPageComponent implements OnInit {
  private readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly page = signal<any | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug') || 'o-nama';
      this.loadPage(slug);
    });
  }

  loadPage(slug: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.publicApi.getPage(slug).subscribe({
      next: (response) => {
        this.page.set(response.page || response.item || response.data || null);
      },
      error: () => {
        this.page.set({
          title: this.fallbackTitle(slug),
          body: this.fallbackBody(slug),
        });
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  fallbackTitle(slug: string): string {
    const titles: Record<string, string> = {
      'o-nama': 'O nama',
      kontakt: 'Kontakt',
      'plan-sedista-i-cene-karata': 'Plan sedišta i cene karata',
      'knjiga-utisaka': 'Online knjiga utisaka',
    };

    return titles[slug] || 'Madlenianum';
  }

  fallbackBody(slug: string): string {
    if (slug === 'kontakt') {
      return 'Kontakt forma i podaci o blagajni biće povezani sa backend kontakt porukama. Ova strana trenutno služi za testiranje public layout-a.';
    }

    if (slug === 'plan-sedista-i-cene-karata') {
      return 'Plan sedišta, cenovne kategorije i ticketing logika već postoje u backend-u. Detaljan prikaz cenovnika može se dopuniti kroz CMS.';
    }

    return 'Opera i teatar Madlenianum osnovan je kao jedinstvena kuća umetnosti. Ovaj tekst je privremeni prikaz dok se ne unese kompletan CMS sadržaj.';
  }
}
