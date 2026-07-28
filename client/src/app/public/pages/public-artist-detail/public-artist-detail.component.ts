import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PublicArtist, PublicExternalLink, PublicGalleryItem, PublicProduction } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicGalleryLightboxComponent } from '../../components/public-gallery-lightbox/public-gallery-lightbox.component';

@Component({
  selector: 'app-public-artist-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicGalleryLightboxComponent],
  templateUrl: './public-artist-detail.component.html',
  styleUrl: './public-artist-detail.component.scss',
})
export class PublicArtistDetailComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);

  readonly artist = signal<PublicArtist | null>(null);
  readonly productions = signal<PublicProduction[]>([]);
  readonly lightbox = signal<PublicGalleryItem[] | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';

    this.publicApi.getArtist(slug).subscribe({
      next: (response) => {
        this.artist.set(this.publicApi.extractItem<PublicArtist>(response, ['artist', 'item']));
        this.productions.set(this.publicApi.extractItems<PublicProduction>(response, ['productions']));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Umetnik trenutno nije dostupan.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  image(artist: PublicArtist): string {
    return this.publicApi.mediaUrl(artist.image);
  }

  name(artist: PublicArtist): string {
    return artist.displayName || 'Umetnik';
  }

  professions(artist: PublicArtist): string {
    return Array.isArray(artist.professions) && artist.professions.length
      ? artist.professions.join(', ')
      : 'Ansambl';
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
      website: 'Web sajt',
    };
    return labels[(link.type || '').toLowerCase()] || 'Javni link';
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
      ? `Uloga: ${production.roles.join(' / ')}`
      : this.publicApi.typeLabel(production.type);
  }

  productionImage(production: PublicProduction, index: number): string {
    return this.publicApi.mediaUrl(production.poster) || this.publicApi.fallbackImage(index);
  }
}
