import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

import { MediaItem } from '../../../core/models/media.models';
import { MediaUrlService } from '../../../core/services/media-url.service';

@Component({
  selector: 'app-media-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-preview.component.html',
  styleUrl: './media-preview.component.scss',
})
export class MediaPreviewComponent {
  @Input({ required: true }) item!: MediaItem;
  @Output() closed = new EventEmitter<void>();

  constructor(private readonly mediaUrls: MediaUrlService) {}

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closed.emit();
  }

  get resolvedUrl(): string {
    return this.mediaUrls.resolve(this.item);
  }

  get isImage(): boolean {
    return this.item.fileType === 'image' || this.item.mimeType?.startsWith('image/');
  }

  get name(): string {
    return this.item.title || this.item.originalName || this.item.filename;
  }
}
