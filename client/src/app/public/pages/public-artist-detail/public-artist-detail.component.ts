import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';

    this.publicApi.getArtist(slug).subscribe({
      next: (response) => {
        this.artist.set(response.artist || response.item || response.data || null);
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
    return this.publicApi.mediaUrl(artist?.image);
  }
}
