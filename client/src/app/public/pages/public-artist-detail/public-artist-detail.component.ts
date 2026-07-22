import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PublicProduction } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-artist-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-artist-detail.component.html',
  styleUrl: './public-artist-detail.component.scss',
})
export class PublicArtistDetailComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);

  readonly artist = signal<any | null>(null);
  readonly productions = signal<PublicProduction[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';

    this.publicApi.getArtist(slug).subscribe({
      next: (response) => {
        this.artist.set(this.publicApi.extractItem<any>(response, ['artist', 'item']));
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

  image(artist: any): string {
    return this.publicApi.mediaUrl(artist?.image)
      || this.publicApi.mediaUrl('/uploads/madlenianum/umetnici/nikola_rakocevic.jpg');
  }

  name(artist: any): string {
    return artist.displayName || artist.name || 'Umetnik';
  }

  professions(artist: any): string {
    return Array.isArray(artist.professions) && artist.professions.length
      ? artist.professions.join(', ')
      : 'Ansambl';
  }

  links(artist: any): any[] {
    return Array.isArray(artist.links)
      ? artist.links.filter((link: any) => link?.url)
      : [];
  }

  productionImage(production: PublicProduction, index: number): string {
    return this.publicApi.mediaUrl(production.poster) || this.publicApi.fallbackImage(index);
  }
}
