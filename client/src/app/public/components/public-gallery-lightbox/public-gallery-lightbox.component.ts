import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, inject, input, output, signal, viewChild } from '@angular/core';

import { PublicGalleryItem, PublicMedia } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';

@Component({
  selector: 'app-public-gallery-lightbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-gallery-lightbox.component.html',
  styleUrl: './public-gallery-lightbox.component.scss',
})
export class PublicGalleryLightboxComponent implements AfterViewInit, OnDestroy {
  readonly items = input<Array<PublicGalleryItem | PublicMedia>>([]);
  readonly closed = output<void>();
  readonly index = signal(0);
  readonly media = inject(MediaUrlService);
  readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly previousFocus = this.document.activeElement as HTMLElement | null;
  private readonly previousOverflow = this.document.body.style.overflow;

  constructor() {
    this.document.body.style.overflow = 'hidden';
  }

  ngAfterViewInit(): void {
    this.closeButton()?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousOverflow;
    this.previousFocus?.focus();
  }

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
  @HostListener('document:keydown.tab', ['$event']) onTab(event: Event): void { this.trapFocus(event as KeyboardEvent); }

  private galleryMedia(item: PublicGalleryItem | PublicMedia | null): unknown {
    return item && this.isGalleryItem(item) ? item.media : item;
  }

  private isGalleryItem(item: PublicGalleryItem | PublicMedia): item is PublicGalleryItem {
    return 'media' in item;
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = Array.from(this.host.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
