import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, finalize, map, switchMap, tap } from 'rxjs';

import { PublicArtist, PublicExternalLink, PublicGalleryItem, PublicProduction } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicGalleryLightboxComponent } from '../../components/public-gallery-lightbox/public-gallery-lightbox.component';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';

@Component({
  selector: 'app-public-artist-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicGalleryLightboxComponent, PublicTranslatePipe],
  templateUrl: './public-artist-detail.component.html',
  styleUrl: './public-artist-detail.component.scss',
})
export class PublicArtistDetailComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly locale = inject(PublicLocaleService);

  readonly artist = signal<PublicArtist | null>(null);
  readonly productions = signal<PublicProduction[]>([]);
  readonly lightbox = signal<PublicGalleryItem[] | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params) => params.get('slug') || ''),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading.set(true);
        this.errorMessage.set('');
        this.artist.set(null);
        this.productions.set([]);
        this.lightbox.set(null);
        window.scrollTo({ top: 0, behavior: 'auto' });
      }),
      switchMap((slug) => this.publicApi.getArtist(slug).pipe(
        catchError((error) => {
          this.errorMessage.set(error?.error?.message || (this.locale.isEnglish() ? 'This artist is currently unavailable.' : 'Umetnik trenutno nije dostupan.'));
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((response) => {
        const item = this.publicApi.extractItem<PublicArtist>(response, ['artist', 'item']);
        this.artist.set(item);
        if (item) {
          this.locale.registerPageLinks({
            sr: `/umetnici/${item.slugs?.sr || item.slug}`,
            en: item.slugs?.en ? `/en/artists/${item.slugs.en}` : '/en/artists',
          });
        }
        this.productions.set(this.publicApi.extractItems<PublicProduction>(response, ['productions']));
    });
  }

  image(artist: PublicArtist): string {
    return this.publicApi.mediaUrl(artist.image);
  }

  name(artist: PublicArtist): string {
    return artist.displayName || (this.locale.isEnglish() ? 'Artist' : 'Umetnik');
  }

  professions(artist: PublicArtist): string {
    return Array.isArray(artist.professions) && artist.professions.length
      ? artist.professions.join(', ')
      : (this.locale.isEnglish() ? 'Ensemble' : 'Ansambl');
  }

  links(artist: PublicArtist): PublicExternalLink[] {
    return Array.isArray(artist.links)
      ? [...artist.links].filter((link) => link?.url).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      : [];
  }

  linkType(link: PublicExternalLink): string {
    const labels: Record<string, string> = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      youtube: 'YouTube',
      linkedin: 'LinkedIn',
      blog: 'Blog',
      website: this.locale.isEnglish() ? 'Website' : 'Web sajt',
    };
    return labels[(link.type || '').toLowerCase()] || (this.locale.isEnglish() ? 'Public link' : 'Javni link');
  }

  gallery(artist: PublicArtist): PublicGalleryItem[] {
    return Array.isArray(artist.galleryItems) ? artist.galleryItems : [];
  }

  galleryImage(item: PublicGalleryItem): string {
    return this.publicApi.mediaUrl(item.media);
  }

  openGallery(items: PublicGalleryItem[], index: number): void {
    this.lightbox.set([...items.slice(index), ...items.slice(0, index)]);
  }

  productionMeta(production: PublicProduction): string {
    return production.roles?.length
      ? `${this.locale.isEnglish() ? 'Role' : 'Uloga'}: ${production.roles.join(' / ')}`
      : this.publicApi.typeLabel(production.type);
  }

  productionImage(production: PublicProduction, index: number): string {
    return this.publicApi.mediaUrl(production.poster) || this.publicApi.fallbackImage(index);
  }
}
