import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { finalize, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { MediaFileType, MediaItem } from '../../../core/models/media.models';
import { AdminMediaService } from '../../../core/services/admin-media.service';

@Component({
  selector: 'app-media-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-upload.component.html',
  styleUrl: './media-upload.component.scss',
})
export class MediaUploadComponent {
  @Input() allowedTypes: MediaFileType[] = ['image', 'document'];
  @Input() compact = false;
  @Output() uploaded = new EventEmitter<MediaItem[]>();

  readonly selectedFiles = signal<File[]>([]);
  readonly isDragging = signal(false);
  readonly isUploading = signal(false);
  readonly errorMessage = signal('');
  readonly maxFileSizeMb = environment.mediaMaxFileSizeMb;

  constructor(private readonly mediaApi: AdminMediaService) {}

  get accept(): string {
    const values: string[] = [];
    if (this.allowedTypes.includes('image')) {
      values.push('.jpg', '.jpeg', '.png', '.webp', '.gif');
    }
    if (this.allowedTypes.includes('document')) {
      values.push('.pdf');
    }
    return values.join(',');
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setFiles(Array.from(input.files || []));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    this.setFiles(Array.from(event.dataTransfer?.files || []));
  }

  removeFile(index: number): void {
    this.selectedFiles.update((files) => files.filter((_file, fileIndex) => fileIndex !== index));
  }

  upload(): void {
    const files = this.selectedFiles();

    if (!files.length || this.isUploading()) {
      return;
    }

    const validationError = this.validateFiles(files);

    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    this.isUploading.set(true);
    this.errorMessage.set('');

    const request = files.length === 1
      ? this.mediaApi.uploadMedia(files[0]).pipe(map((response) => [response.item]))
      : this.mediaApi.uploadMultipleMedia(files).pipe(map((response) => response.items));

    request
      .pipe(finalize(() => this.isUploading.set(false)))
      .subscribe({
        next: (items) => {
          this.selectedFiles.set([]);
          this.uploaded.emit(items);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Upload failed. Please try again.');
        },
      });
  }

  private setFiles(files: File[]): void {
    this.errorMessage.set('');
    const unique = new Map<string, File>();
    [...this.selectedFiles(), ...files].forEach((file) => {
      unique.set(`${file.name}-${file.size}-${file.lastModified}`, file);
    });
    this.selectedFiles.set(Array.from(unique.values()).slice(0, 20));
  }

  private validateFiles(files: File[]): string {
    const allowedMimeTypes = new Set<string>();
    if (this.allowedTypes.includes('image')) {
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].forEach((type) => allowedMimeTypes.add(type));
    }
    if (this.allowedTypes.includes('document')) {
      allowedMimeTypes.add('application/pdf');
    }

    const unsupported = files.find((file) => !allowedMimeTypes.has(file.type));
    if (unsupported) {
      return `${unsupported.name}: unsupported file type.`;
    }

    const maximumBytes = this.maxFileSizeMb * 1024 * 1024;
    const oversized = files.find((file) => file.size > maximumBytes);
    if (oversized) {
      return `${oversized.name}: file exceeds the ${this.maxFileSizeMb} MB limit.`;
    }

    return '';
  }
}
