import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, input, output, signal } from '@angular/core';

import { PublicGalleryItem, PublicMedia } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';

@Component({
  selector: 'app-public-gallery-lightbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-gallery-lightbox.component.html',
  styleUrl: './public-gallery-lightbox.component.scss',
})
export class PublicGalleryLightboxComponent {
  readonly items = input<Array<PublicGalleryItem | PublicMedia>>([]);
  readonly closed = output<void>();
  readonly index = signal(0);
  readonly media = inject(MediaUrlService);

  current(): PublicGalleryItem | PublicMedia | null { return this.items()[this.index()] || null; }
  image(item: PublicGalleryItem | PublicMedia | null): string { return this.media.resolve(this.galleryMedia(item)); }
  caption(item: PublicGalleryItem | PublicMedia | null): string {
    if (!item) return '';
    if (this.isGalleryItem(item)) {
      const media = item.media && typeof item.media === 'object' ? item.media : null;
      return item.caption || media?.caption || '';
    }
    return item.caption || '';
  }
  alt(item: PublicGalleryItem | PublicMedia | null): string {
    if (!item) return '';
    if (this.isGalleryItem(item)) return item.altText || (typeof item.media === 'object' ? item.media?.altText || item.media?.alt || '' : '');
    return item.altText || item.alt || item.title || '';
  }
  previous(): void { this.index.update((value) => (value - 1 + this.items().length) % this.items().length); }
  next(): void { this.index.update((value) => (value + 1) % this.items().length); }
  close(): void { this.closed.emit(); }

  @HostListener('document:keydown.escape') onEscape(): void { this.close(); }
  @HostListener('document:keydown.arrowleft') onLeft(): void { if (this.items().length > 1) this.previous(); }
  @HostListener('document:keydown.arrowright') onRight(): void { if (this.items().length > 1) this.next(); }

  private galleryMedia(item: PublicGalleryItem | PublicMedia | null): unknown {
    return item && this.isGalleryItem(item) ? item.media : item;
  }

  private isGalleryItem(item: PublicGalleryItem | PublicMedia): item is PublicGalleryItem {
    return 'media' in item;
  }
}
