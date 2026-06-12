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
        this.artists.set(this.publicApi.extractItems<any>(response, ['artists']));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Umetnici trenutno nisu dostupni.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  image(artist: any): string {
    return this.publicApi.mediaUrl(artist.image);
  }
}
