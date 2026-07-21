import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import {
  MediaFileType,
  MediaItem,
  MediaSelectionResult,
  MediaSelectionValue,
} from '../../../core/models/media.models';
import { AdminMediaService } from '../../../core/services/admin-media.service';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { MediaGridComponent } from '../media-grid/media-grid.component';
import { MediaPreviewComponent } from '../media-preview/media-preview.component';
import { MediaUploadComponent } from '../media-upload/media-upload.component';

@Component({
  selector: 'app-media-picker',
  standalone: true,
  imports: [CommonModule, MediaGridComponent, MediaPreviewComponent, MediaUploadComponent],
  templateUrl: './media-picker.component.html',
  styleUrl: './media-picker.component.scss',
})
export class MediaPickerComponent implements OnChanges {
  @Input() label = 'Media';
  @Input() mode: 'single' | 'multiple' = 'single';
  @Input() mediaKind: 'image' | 'document' | 'all' = 'image';
  @Input() value: MediaSelectionValue[] = [];
  @Output() selectionChange = new EventEmitter<MediaSelectionResult>();

  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly items = signal<MediaItem[]>([]);
  readonly currentItems = signal<MediaItem[]>([]);
  readonly currentIds = signal<string[]>([]);
  readonly pendingIds = signal<string[]>([]);
  readonly pendingItems = signal<MediaItem[]>([]);
  readonly previewItem = signal<MediaItem | null>(null);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly fileType = signal<'all' | MediaFileType>('image');
  searchText = '';

  constructor(
    private readonly mediaApi: AdminMediaService,
    private readonly mediaUrls: MediaUrlService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['mediaKind']) {
      this.fileType.set(this.mediaKind === 'all' ? 'all' : this.mediaKind);
      this.synchronizeValue();
    }
  }

  get uploadTypes(): MediaFileType[] {
    if (this.mediaKind === 'image') return ['image'];
    if (this.mediaKind === 'document') return ['document'];
    return ['image', 'document'];
  }

  open(): void {
    this.pendingIds.set([...this.currentIds()]);
    this.pendingItems.set([...this.currentItems()]);
    this.page.set(1);
    this.isOpen.set(true);
    this.loadMedia();
  }

  close(): void {
    this.isOpen.set(false);
    this.errorMessage.set('');
  }

  loadMedia(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.mediaApi
      .listMedia({
        page: this.page(),
        limit: 12,
        search: this.searchText.trim(),
        fileType: this.fileType(),
        sort: 'newest',
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.items.set(response.items || []);
          this.total.set(response.total || 0);
          this.totalPages.set(response.totalPages || response.pagination?.pages || 1);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Media could not be loaded.');
        },
      });
  }

  search(event?: Event): void {
    event?.preventDefault();
    this.page.set(1);
    this.loadMedia();
  }

  updateSearch(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
  }

  changeType(event: Event): void {
    this.fileType.set((event.target as HTMLSelectElement).value as 'all' | MediaFileType);
    this.page.set(1);
    this.loadMedia();
  }

  toggle(item: MediaItem): void {
    if (this.mode === 'single') {
      this.pendingIds.set([item._id]);
      this.pendingItems.set([item]);
      return;
    }

    if (this.pendingIds().includes(item._id)) {
      this.pendingIds.update((ids) => ids.filter((id) => id !== item._id));
      this.pendingItems.update((items) => items.filter((entry) => entry._id !== item._id));
      return;
    }

    this.pendingIds.update((ids) => [...ids, item._id]);
    this.pendingItems.update((items) => [...items, item]);
  }

  confirm(): void {
    const ids = [...this.pendingIds()];
    const known = new Map<string, MediaItem>();
    [...this.currentItems(), ...this.items(), ...this.pendingItems()].forEach((item) => {
      known.set(item._id, item);
    });
    const items = ids.map((id) => known.get(id)).filter((item): item is MediaItem => Boolean(item));

    this.currentIds.set(ids);
    this.currentItems.set(items);
    this.selectionChange.emit({ ids, items });
    this.close();
  }

  removeCurrent(id: string): void {
    const ids = this.currentIds().filter((currentId) => currentId !== id);
    const items = this.currentItems().filter((item) => item._id !== id);
    this.currentIds.set(ids);
    this.currentItems.set(items);
    this.selectionChange.emit({ ids, items });
  }

  onUploaded(uploadedItems: MediaItem[]): void {
    if (!uploadedItems.length) return;

    const selectableItems = uploadedItems.filter((item) => {
      if (this.mediaKind === 'all') return true;
      return item.fileType === this.mediaKind;
    });

    if (this.mode === 'single' && selectableItems.length) {
      const item = selectableItems[selectableItems.length - 1];
      this.pendingIds.set([item._id]);
      this.pendingItems.set([item]);
    } else if (this.mode === 'multiple') {
      selectableItems.forEach((item) => {
        if (!this.pendingIds().includes(item._id)) {
          this.pendingIds.update((ids) => [...ids, item._id]);
          this.pendingItems.update((items) => [...items, item]);
        }
      });
    }

    this.page.set(1);
    this.loadMedia();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((page) => page - 1);
    this.loadMedia();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((page) => page + 1);
    this.loadMedia();
  }

  mediaUrl(item: MediaItem): string {
    return this.mediaUrls.resolve(item);
  }

  itemName(item: MediaItem): string {
    return item.title || item.originalName || item.filename;
  }

  private synchronizeValue(): void {
    const values = Array.isArray(this.value) ? this.value : [];
    const ids: string[] = [];
    const items: MediaItem[] = [];

    values.forEach((value) => {
      if (typeof value === 'string') {
        if (value && !ids.includes(value)) ids.push(value);
        return;
      }

      const id = String(value?._id || value?.id || '');
      if (id && !ids.includes(id)) {
        ids.push(id);
        items.push(value);
      }
    });

    this.currentIds.set(ids);
    this.currentItems.set(items);

    const missingIds = ids.filter((id) => !items.some((item) => item._id === id));

    if (!missingIds.length) {
      return;
    }

    forkJoin(
      missingIds.map((id) =>
        this.mediaApi.getMedia(id).pipe(
          map((response) => response.item),
          catchError(() => of(null))
        )
      )
    ).subscribe((loadedItems) => {
      const validItems = loadedItems.filter((item): item is MediaItem => Boolean(item));
      this.currentItems.update((current) => [...current, ...validItems]);
    });
  }
}
