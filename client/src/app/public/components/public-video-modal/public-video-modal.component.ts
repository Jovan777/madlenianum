import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { PublicVideo } from '../../../core/models/public.models';

@Component({
  selector: 'app-public-video-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-video-modal.component.html',
  styleUrl: './public-video-modal.component.scss',
})
export class PublicVideoModalComponent implements AfterViewInit, OnDestroy {
  readonly video = input.required<PublicVideo>();
  readonly closed = output<void>();
  readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly sanitizer = inject(DomSanitizer);

  readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const safeUrl = this.buildEmbedUrl(this.video());
    return safeUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(safeUrl) : null;
  });

  constructor() {
    document.body.style.overflow = 'hidden';
  }

  ngAfterViewInit(): void {
    this.closeButton()?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.closed.emit();
  }

  private buildEmbedUrl(video: PublicVideo): string {
    try {
      const url = new URL(video.url);
      if (video.provider === 'youtube' || url.hostname.includes('youtube.com') || url.hostname === 'youtu.be') {
        const id = url.hostname === 'youtu.be'
          ? url.pathname.split('/').filter(Boolean)[0]
          : url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0` : '';
      }
      if (video.provider === 'vimeo' || url.hostname.includes('vimeo.com')) {
        const id = url.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part));
        return id ? `https://player.vimeo.com/video/${id}` : '';
      }
    } catch {
      return '';
    }
    return '';
  }
}
