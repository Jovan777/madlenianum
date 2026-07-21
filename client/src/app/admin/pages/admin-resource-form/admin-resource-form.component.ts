import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';
import {
  MediaSelectionResult,
  MediaSelectionValue,
} from '../../../core/models/media.models';
import { MediaPickerComponent } from '../../components/media-picker/media-picker.component';
import { ADMIN_RESOURCE_CONFIGS, ResourceConfig, ResourceFormField } from '../../config/admin-resource.config';

@Component({
  selector: 'app-admin-resource-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MediaPickerComponent],
  templateUrl: './admin-resource-form.component.html',
  styleUrl: './admin-resource-form.component.scss',
})
export class AdminResourceFormComponent implements OnInit {
  private readonly fb = inject(UntypedFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly resource = signal('');
  readonly itemId = signal<string | null>(null);
  readonly item = signal<Record<string, any> | null>(null);
  readonly mediaValues = signal<Record<string, MediaSelectionValue[]>>({});

  readonly form = this.fb.group({});

  ngOnInit(): void {
    const resource = this.route.snapshot.paramMap.get('resource') || '';
    const id = this.route.snapshot.paramMap.get('id');

    this.resource.set(resource);
    this.itemId.set(id);

    this.buildForm();

    if (id) {
      this.loadItem(resource, id);
    }
  }

  get config(): ResourceConfig {
    return ADMIN_RESOURCE_CONFIGS[this.resource()] || ADMIN_RESOURCE_CONFIGS['productions'];
  }

  get fields(): ResourceFormField[] {
    return this.config.formFields || [];
  }

  get isEditMode(): boolean {
    return Boolean(this.itemId());
  }

  get listLink(): string[] {
    return ['/admin', this.resource()];
  }

  buildForm(): void {
    this.fields.forEach((field) => {
      const validators = field.required ? [Validators.required] : [];
      const defaultValue = field.type === 'checkbox'
        ? false
        : field.type === 'media-multiple'
          ? []
          : '';
      this.form.addControl(field.key, this.fb.control(defaultValue, validators));
    });
  }

  loadItem(resource: string, id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.getItem<Record<string, any>>(resource, id).subscribe({
      next: (response) => {
        this.item.set(response.item);
        this.patchForm(response.item);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Item could not be loaded.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  patchForm(item: Record<string, any>): void {
    const payload: Record<string, unknown> = {};

    this.fields.forEach((field) => {
      const rawValue = item[field.key];

      if (field.type === 'array') {
        payload[field.key] = Array.isArray(rawValue) ? rawValue.join(', ') : rawValue || '';
        return;
      }

      if (field.type === 'date') {
        payload[field.key] = this.toDateTimeLocal(rawValue);
        return;
      }

      if (field.type === 'media-single' || field.type === 'media-multiple') {
        const values = field.type === 'media-multiple'
          ? (Array.isArray(rawValue) ? rawValue : [])
          : (rawValue ? [rawValue] : []);
        this.mediaValues.update((current) => ({ ...current, [field.key]: values }));
        payload[field.key] = field.type === 'media-multiple'
          ? values.map((value) => this.getMediaId(value)).filter(Boolean)
          : this.getMediaId(values[0]);
        return;
      }

      payload[field.key] = rawValue ?? (field.type === 'checkbox' ? false : '');
    });

    this.form.patchValue(payload);
  }

  submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload = this.buildPayload();
    const id = this.itemId();
    const request = id
      ? this.api.update(this.resource(), id, payload)
      : this.api.create(this.resource(), payload);

    request.subscribe({
      next: (response) => {
        this.successMessage.set(id ? 'Saved.' : 'Created.');

        if (!id) {
          const newId = String((response.item as any)?._id || (response.item as any)?.id || '');

          if (newId) {
            this.router.navigate(['/admin', this.resource(), newId, 'edit']);
            return;
          }
        }

        this.item.set((response.item as Record<string, any>) || null);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Save failed.');
      },
      complete: () => {
        this.isSaving.set(false);
      },
    });
  }

  mediaValue(fieldKey: string): MediaSelectionValue[] {
    return this.mediaValues()[fieldKey] || [];
  }

  updateMediaField(field: ResourceFormField, selection: MediaSelectionResult): void {
    this.mediaValues.update((current) => ({
      ...current,
      [field.key]: selection.items.length ? selection.items : selection.ids,
    }));
    this.form.get(field.key)?.setValue(
      field.type === 'media-multiple' ? selection.ids : selection.ids[0] || ''
    );
    this.form.get(field.key)?.markAsDirty();
  }

  buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue() as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    this.fields.forEach((field) => {
      const value = raw[field.key];

      if (field.type === 'array') {
        payload[field.key] = String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        return;
      }

      if (field.type === 'number') {
        payload[field.key] = value === '' || value === null || value === undefined ? undefined : Number(value);
        return;
      }

      if (field.type === 'checkbox') {
        payload[field.key] = Boolean(value);
        return;
      }

      if (field.type === 'date') {
        payload[field.key] = value ? new Date(String(value)).toISOString() : undefined;
        return;
      }

      if (field.type === 'media-single') {
        payload[field.key] = value || null;
        return;
      }

      if (field.type === 'media-multiple') {
        payload[field.key] = Array.isArray(value) ? value.filter(Boolean) : [];
        return;
      }

      payload[field.key] = value;
    });

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return payload;
  }

  deleteItem(): void {
    const id = this.itemId();

    if (!id || !this.config.canDelete) {
      return;
    }

    const confirmed = window.confirm('Delete this item? This action cannot be undone.');

    if (!confirmed) {
      return;
    }

    this.api.delete(this.resource(), id).subscribe({
      next: () => {
        this.router.navigate(this.listLink);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Delete failed.');
      },
    });
  }

  toDateTimeLocal(value: unknown): string {
    if (!value) {
      return '';
    }

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private getMediaId(value: MediaSelectionValue | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return String(value._id || value.id || '');
  }
}
