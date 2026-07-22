import { CommonModule } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicProduction, PublicVideo } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { PublicVideoModalComponent } from '../public-video-modal/public-video-modal.component';

@Component({
  selector: 'app-public-featured-section',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicVideoModalComponent],
  templateUrl: './public-featured-section.component.html',
  styleUrl: './public-featured-section.component.scss',
})
export class PublicFeaturedSectionComponent {
  readonly productions = input<PublicProduction[]>([]);
  readonly heading = input('Ne propustite');
  readonly activeVideo = signal<PublicVideo | null>(null);
  private readonly media = inject(MediaUrlService);

  image(production: PublicProduction): string {
    const galleryImage = production.galleryItems?.[0]?.media || production.gallery?.[0];
    return this.media.resolve(galleryImage) || this.media.resolve(production.poster);
  }

  trailer(production: PublicProduction): PublicVideo | null {
    return production.trailer || production.videos?.find((video) => video.isTrailer) || production.videos?.[0] || null;
  }
}
