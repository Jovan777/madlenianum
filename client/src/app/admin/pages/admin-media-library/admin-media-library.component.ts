import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { MediaItem, MediaUsage } from '../../../core/models/media.models';
import { AdminMediaService } from '../../../core/services/admin-media.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import {
  AdminContentLanguage,
  AdminLanguageTabsComponent,
} from '../../components/admin-language-tabs.component';
import { MediaGridComponent } from '../../components/media-grid/media-grid.component';
import { MediaPreviewComponent } from '../../components/media-preview/media-preview.component';
import { MediaUploadComponent } from '../../components/media-upload/media-upload.component';

interface DeleteConflict {
  item: MediaItem;
  usage: MediaUsage[];
}

@Component({
  selector: 'app-admin-media-library',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MediaUploadComponent,
    MediaGridComponent,
    MediaPreviewComponent,
    AdminLanguageTabsComponent,
  ],
  templateUrl: './admin-media-library.component.html',
  styleUrl: './admin-media-library.component.scss',
})
export class AdminMediaLibraryComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly items = signal<MediaItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isCheckingUsage = signal(false);
  readonly errorMessage = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly fileType = signal<'all' | 'image' | 'document'>('all');
  readonly previewItem = signal<MediaItem | null>(null);
  readonly editItem = signal<MediaItem | null>(null);
  readonly deleteConflict = signal<DeleteConflict | null>(null);
  readonly activeLanguage = signal<AdminContentLanguage>('sr');
  searchText = '';

  readonly metadataForm = this.fb.nonNullable.group({
    title: [''],
    altText: [''],
    caption: [''],
    credit: [''],
    translations: this.fb.nonNullable.group({
      en: this.fb.nonNullable.group({
        title: [''],
        alt: [''],
        caption: [''],
        credit: [''],
      }),
    }),
  });

  constructor(
    private readonly mediaApi: AdminMediaService,
    private readonly notifications: AdminNotificationService,
  ) {}

  ngOnInit(): void {
    this.loadMedia();
  }

  loadMedia(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.mediaApi
      .listMedia({
        page: this.page(),
        limit: 24,
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
          this.errorMessage.set(error?.error?.message || 'Media Library could not be loaded.');
        },
      });
  }

  search(event: Event): void {
    event.preventDefault();
    this.page.set(1);
    this.loadMedia();
  }

  updateSearch(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
  }

  changeFileType(event: Event): void {
    this.fileType.set((event.target as HTMLSelectElement).value as 'all' | 'image' | 'document');
    this.page.set(1);
    this.loadMedia();
  }

  uploaded(items: MediaItem[]): void {
    this.notifications.success(
      `${items.length} media item${items.length === 1 ? '' : 's'} uploaded.`,
    );
    this.page.set(1);
    this.loadMedia();
  }

  openEdit(item: MediaItem): void {
    this.editItem.set(item);
    this.activeLanguage.set('sr');
    this.metadataForm.reset({
      title: item.title || '',
      altText: item.altText || item.alt || '',
      caption: item.caption || '',
      credit: item.credit || '',
      translations: {
        en: {
          title: item.translations?.en?.title || '',
          alt: item.translations?.en?.alt || '',
          caption: item.translations?.en?.caption || '',
          credit: item.translations?.en?.credit || '',
        },
      },
    });
  }

  englishComplete(): boolean {
    const value = this.metadataForm.controls.translations.controls.en.getRawValue();
    return Boolean(value.title.trim() && value.alt.trim());
  }

  saveMetadata(): void {
    const item = this.editItem();
    if (!item || this.isSaving()) return;

    this.isSaving.set(true);
    this.mediaApi
      .updateMedia(item._id, this.metadataForm.getRawValue())
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          this.items.update((items) =>
            items.map((entry) => (entry._id === response.item._id ? response.item : entry)),
          );
          this.editItem.set(null);
          this.notifications.success('Media metadata updated.');
        },
        error: (error) => {
          this.notifications.error(error?.error?.message || 'Metadata update failed.');
        },
      });
  }

  requestDelete(item: MediaItem): void {
    if (this.isCheckingUsage()) return;

    this.isCheckingUsage.set(true);
    this.mediaApi
      .getMediaUsage(item._id)
      .pipe(finalize(() => this.isCheckingUsage.set(false)))
      .subscribe({
        next: (response) => {
          if (response.inUse) {
            this.deleteConflict.set({ item, usage: response.usage });
            return;
          }

          if (
            window.confirm(`Delete "${item.title || item.originalName}"? This cannot be undone.`)
          ) {
            this.deleteUnused(item);
          }
        },
        error: (error) => {
          this.notifications.error(error?.error?.message || 'Media usage could not be checked.');
        },
      });
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

  private deleteUnused(item: MediaItem): void {
    this.mediaApi.deleteMedia(item._id).subscribe({
      next: (response) => {
        this.notifications.success(response.message || 'Media item deleted.');
        this.loadMedia();
      },
      error: (error) => {
        if (error?.status === 409 && Array.isArray(error?.error?.usage)) {
          this.deleteConflict.set({ item, usage: error.error.usage });
          return;
        }
        this.notifications.error(error?.error?.message || 'Media deletion failed.');
      },
    });
  }
}
