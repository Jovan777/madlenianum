import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicArtist } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';

@Component({
  selector: 'app-public-artists',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-artists.component.html',
  styleUrl: './public-artists.component.scss',
})
export class PublicArtistsComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);
  readonly artists = signal<PublicArtist[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.publicApi.getArtists().subscribe({
      next: (response) => {
        this.artists.set(this.publicApi.extractItems<PublicArtist>(response, ['artists', 'items']));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || this.i18n.t('artists.error'));
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
    return artist.displayName || this.i18n.t('artists.defaultName');
  }

  professions(artist: PublicArtist): string {
    return Array.isArray(artist.professions) && artist.professions.length
      ? artist.professions.join(', ')
      : this.i18n.t('artists.defaultProfession');
  }

  initials(artist: PublicArtist): string {
    return this.name(artist)
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('');
  }
}
