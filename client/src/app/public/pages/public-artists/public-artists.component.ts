import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-artists',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-artists.component.html',
  styleUrl: './public-artists.component.scss',
})
export class PublicArtistsComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  readonly artists = signal<any[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.publicApi.getArtists().subscribe({
      next: (response) => {
        this.artists.set(this.publicApi.extractItems<any>(response, ['artists', 'items']));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Umetnici trenutno nisu dostupni.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  image(artist: any, index: number): string {
    return this.publicApi.mediaUrl(artist.image) || this.artistFallback(index);
  }

  name(artist: any): string {
    return artist.displayName || artist.name || 'Umetnik';
  }

  professions(artist: any): string {
    return Array.isArray(artist.professions) && artist.professions.length
      ? artist.professions.join(', ')
      : 'Ansambl';
  }

  private artistFallback(index: number): string {
    const images = [
      '/uploads/madlenianum/umetnici/nikola_rakocevic.jpg',
      '/uploads/madlenianum/umetnici/Tamara_Aleksic.jpg',
      '/uploads/madlenianum/umetnici/ivan_vukovic.jpg',
    ];

    return this.publicApi.mediaUrl(images[Math.abs(index) % images.length]);
  }
}
