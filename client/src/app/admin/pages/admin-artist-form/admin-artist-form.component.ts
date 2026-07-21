import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';
import { MediaSelectionResult, MediaSelectionValue } from '../../../core/models/media.models';
import { MediaPickerComponent } from '../../components/media-picker/media-picker.component';

@Component({
  selector: 'app-admin-artist-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MediaPickerComponent],
  templateUrl: './admin-artist-form.component.html',
  styleUrl: './admin-artist-form.component.scss',
})
export class AdminArtistFormComponent implements OnInit {
  private readonly fb = inject(UntypedFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);

  readonly itemId = signal<string | null>(null);
  readonly options = signal<Record<string, any[]>>({});
  readonly imageSelection = signal<MediaSelectionValue[]>([]);
  readonly gallerySelection = signal<MediaSelectionValue[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.group({
    displayName: ['', Validators.required],
    slug: [''],
    professionsText: [''],
    biography: [''],
    image: [''],
    gallery: [[]],
    status: ['published', Validators.required],
    links: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.itemId.set(id);
    this.loadOptions();

    if (id) {
      this.loadItem(id);
    } else {
      this.addLink();
    }
  }

  get isEditMode(): boolean {
    return Boolean(this.itemId());
  }

  get statuses(): any[] {
    return this.options()['statuses'] || [];
  }

  get links(): UntypedFormArray {
    return this.form.get('links') as UntypedFormArray;
  }

  loadOptions(): void {
    this.api.getArtistFormOptions().subscribe({
      next: (response) => this.options.set(response.options || {}),
      error: () => {
        this.options.set({});
      },
    });
  }

  loadItem(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.getItem<any>('artists', id).subscribe({
      next: (response) => {
        this.patchForm(response.item || {});
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Artist could not be loaded.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  patchForm(item: any): void {
    this.links.clear();

    const links = Array.isArray(item.links) ? item.links : [];
    links.forEach((entry: any) => this.links.push(this.createLinkGroup(entry)));

    if (!links.length) {
      this.addLink();
    }

    this.form.patchValue({
      displayName: item.displayName || '',
      slug: item.slug || '',
      professionsText: Array.isArray(item.professions) ? item.professions.join(', ') : '',
      biography: item.biography || '',
      image: this.getId(item.image),
      gallery: Array.isArray(item.gallery) ? item.gallery.map((media: any) => this.getId(media)).filter(Boolean) : [],
      status: item.status || 'published',
    });

    this.imageSelection.set(item.image ? [item.image] : []);
    this.gallerySelection.set(Array.isArray(item.gallery) ? item.gallery : []);
  }

  addLink(entry: any = {}): void {
    this.links.push(this.createLinkGroup(entry));
  }

  removeLink(index: number): void {
    this.links.removeAt(index);

    if (!this.links.length) {
      this.addLink();
    }
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.itemId();
    const payload = this.buildPayload();
    const request = id
      ? this.api.update('artists', id, payload)
      : this.api.create('artists', payload);

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    request.subscribe({
      next: (response) => {
        this.successMessage.set(id ? 'Artist saved.' : 'Artist created.');

        if (!id) {
          const newId = String((response.item as any)?._id || '');

          if (newId) {
            this.router.navigate(['/admin/artists', newId, 'edit']);
          }
        }
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Artist could not be saved.');
      },
      complete: () => {
        this.isSaving.set(false);
      },
    });
  }

  updateImage(selection: MediaSelectionResult): void {
    this.imageSelection.set(selection.items.length ? selection.items : selection.ids);
    this.form.patchValue({ image: selection.ids[0] || '' });
  }

  updateGallery(selection: MediaSelectionResult): void {
    this.gallerySelection.set(selection.items.length ? selection.items : selection.ids);
    this.form.patchValue({ gallery: selection.ids });
  }

  buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();

    return {
      displayName: raw.displayName,
      slug: raw.slug || undefined,
      professions: String(raw.professionsText || '')
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean),
      biography: raw.biography || '',
      image: raw.image || null,
      gallery: Array.isArray(raw.gallery) ? raw.gallery.filter(Boolean) : [],
      status: raw.status || 'published',
      links: (raw.links || [])
        .map((entry: any) => ({
          label: entry.label,
          url: entry.url,
        }))
        .filter((entry: any) => entry.label || entry.url),
    };
  }

  private createLinkGroup(entry: any = {}) {
    return this.fb.group({
      label: [entry.label || ''],
      url: [entry.url || ''],
    });
  }

  private getId(value: any): string {
    if (!value) {
      return '';
    }

    return String(value._id || value.id || value);
  }
}
