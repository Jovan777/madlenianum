import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicArtist } from '../../../core/models/public.models';
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
  readonly artists = signal<PublicArtist[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.publicApi.getArtists().subscribe({
      next: (response) => {
        this.artists.set(this.publicApi.extractItems<PublicArtist>(response, ['artists', 'items']));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Umetnici trenutno nisu dostupni.');
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

  initials(artist: PublicArtist): string {
    return this.name(artist)
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('');
  }
}
