import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { MediaItem } from '../../../core/models/media.models';
import { MediaUrlService } from '../../../core/services/media-url.service';

@Component({
  selector: 'app-media-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-grid.component.html',
  styleUrl: './media-grid.component.scss',
})
export class MediaGridComponent {
  @Input() items: MediaItem[] = [];
  @Input() selectable = false;
  @Input() selectedIds: string[] = [];
  @Input() showManagementActions = true;

  @Output() selectionToggle = new EventEmitter<MediaItem>();
  @Output() preview = new EventEmitter<MediaItem>();
  @Output() edit = new EventEmitter<MediaItem>();
  @Output() remove = new EventEmitter<MediaItem>();

  readonly brokenImages = signal<Set<string>>(new Set());

  constructor(private readonly mediaUrls: MediaUrlService) {}

  mediaUrl(item: MediaItem): string {
    return this.mediaUrls.resolve(item);
  }

  itemName(item: MediaItem): string {
    return item.title || item.originalName || item.filename || 'Untitled media';
  }

  isImage(item: MediaItem): boolean {
    return item.fileType === 'image' || item.mimeType?.startsWith('image/');
  }

  isSelected(item: MediaItem): boolean {
    return this.selectedIds.includes(item._id);
  }

  toggle(item: MediaItem): void {
    if (this.selectable) {
      this.selectionToggle.emit(item);
      return;
    }

    this.preview.emit(item);
  }

  markBroken(item: MediaItem): void {
    this.brokenImages.update((current) => {
      const next = new Set(current);
      next.add(item._id);
      return next;
    });
  }

  formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  formatDate(value?: string): string {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString('sr-RS');
  }

  trackById(_index: number, item: MediaItem): string {
    return item._id;
  }
}
