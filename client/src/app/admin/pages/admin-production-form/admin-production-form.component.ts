import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-production-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-production-form.component.html',
  styleUrl: './admin-production-form.component.scss',
})
export class AdminProductionFormComponent implements OnInit {
  private readonly fb = inject(UntypedFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);

  readonly itemId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly options = signal<Record<string, any[]>>({});

  readonly form = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    type: ['drama', Validators.required],
    authorComposer: [''],
    originalTitle: [''],
    subtitle: [''],
    shortDescription: [''],
    description: [''],
    synopsis: [''],
    premiereDate: [''],
    isPremiere: [false],
    isOnRepertoire: [true],
    venue: [''],
    durationMinutes: [''],
    performanceLanguage: ['sr'],
    subtitles: [''],
    poster: [''],
    gallery: [[]],
    season: ['2025/2026'],
    tagsText: [''],
    status: ['draft', Validators.required],
    isFeatured: [false],
    creativeTeam: this.fb.array([]),
    cast: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.itemId.set(id);
    this.loadOptions();

    if (id) {
      this.loadItem(id);
    }
  }

  get isEditMode(): boolean {
    return Boolean(this.itemId());
  }

  get creativeTeam(): UntypedFormArray {
    return this.form.get('creativeTeam') as UntypedFormArray;
  }

  get cast(): UntypedFormArray {
    return this.form.get('cast') as UntypedFormArray;
  }

  get artists(): any[] {
    return this.options()['artists'] || [];
  }

  get media(): any[] {
    return this.options()['media'] || [];
  }

  get venues(): any[] {
    return this.options()['venues'] || [];
  }

  get productionTypes(): any[] {
    return this.options()['productionTypes'] || [];
  }

  get statuses(): any[] {
    return this.options()['statuses'] || [];
  }

  creativeTeamControls(): any[] {
    return this.creativeTeam.controls;
  }

  castControls(): any[] {
    return this.cast.controls;
  }

  loadOptions(): void {
    this.api.getProductionFormOptions().subscribe({
      next: (response) => {
        this.options.set(response.options || {});
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Production options could not be loaded.');
      },
    });
  }

  loadItem(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.getItem<any>('productions', id).subscribe({
      next: (response) => {
        this.patchForm(response.item);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Production could not be loaded.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  patchForm(item: any): void {
    this.form.patchValue({
      title: item.title || '',
      slug: item.slug || '',
      type: item.type || 'drama',
      authorComposer: item.authorComposer || '',
      originalTitle: item.originalTitle || '',
      subtitle: item.subtitle || '',
      shortDescription: item.shortDescription || '',
      description: item.description || '',
      synopsis: item.synopsis || '',
      premiereDate: this.toDateInput(item.premiereDate),
      isPremiere: Boolean(item.isPremiere),
      isOnRepertoire: item.isOnRepertoire !== false,
      venue: this.getId(item.venue),
      durationMinutes: item.durationMinutes || '',
      performanceLanguage: item.performanceLanguage || 'sr',
      subtitles: item.subtitles || '',
      poster: this.getId(item.poster),
      gallery: Array.isArray(item.gallery) ? item.gallery.map((entry: any) => this.getId(entry)).filter(Boolean) : [],
      season: item.season || '2025/2026',
      tagsText: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      status: item.status || 'draft',
      isFeatured: Boolean(item.isFeatured),
    });

    this.creativeTeam.clear();
    (item.creativeTeam || []).forEach((entry: any) => this.addCreativeTeam(entry));

    this.cast.clear();
    (item.cast || []).forEach((entry: any) => this.addCast(entry));
  }

  addCreativeTeam(entry: any = {}): void {
    this.creativeTeam.push(
      this.fb.group({
        role: [entry.role || ''],
        artist: [this.getId(entry.artist)],
        name: [entry.name || ''],
        order: [entry.order ?? this.creativeTeam.length + 1],
      })
    );
  }

  removeCreativeTeam(index: number): void {
    this.creativeTeam.removeAt(index);
  }

  addCast(entry: any = {}): void {
    this.cast.push(
      this.fb.group({
        character: [entry.character || ''],
        artist: [this.getId(Array.isArray(entry.artists) ? entry.artists[0] : '')],
        namesText: [Array.isArray(entry.names) ? entry.names.join(', ') : ''],
        order: [entry.order ?? this.cast.length + 1],
      })
    );
  }

  removeCast(index: number): void {
    this.cast.removeAt(index);
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const id = this.itemId();
    const payload = this.buildPayload();
    const request = id ? this.api.update<any>('productions', id, payload) : this.api.create<any>('productions', payload);

    request.subscribe({
      next: (response) => {
        const savedId = this.getId(response.item);
        this.successMessage.set('Production saved.');

        if (!id && savedId) {
          this.router.navigate(['/admin/productions', savedId, 'edit']);
        }
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Production save failed.');
      },
      complete: () => {
        this.isSaving.set(false);
      },
    });
  }

  buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();

    return this.removeEmpty({
      title: raw.title,
      slug: raw.slug,
      type: raw.type,
      authorComposer: raw.authorComposer,
      originalTitle: raw.originalTitle,
      subtitle: raw.subtitle,
      shortDescription: raw.shortDescription,
      description: raw.description,
      synopsis: raw.synopsis,
      premiereDate: raw.premiereDate ? new Date(raw.premiereDate).toISOString() : undefined,
      isPremiere: Boolean(raw.isPremiere),
      isOnRepertoire: Boolean(raw.isOnRepertoire),
      venue: raw.venue || undefined,
      durationMinutes: raw.durationMinutes ? Number(raw.durationMinutes) : undefined,
      performanceLanguage: raw.performanceLanguage,
      subtitles: raw.subtitles,
      poster: raw.poster || undefined,
      gallery: Array.isArray(raw.gallery) ? raw.gallery.filter(Boolean) : [],
      season: raw.season,
      tags: String(raw.tagsText || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      status: raw.status,
      isFeatured: Boolean(raw.isFeatured),
      creativeTeam: this.creativeTeam.getRawValue()
        .map((entry: any) => ({
          role: entry.role,
          artist: entry.artist || undefined,
          name: entry.name,
          order: Number(entry.order || 0),
        }))
        .filter((entry: any) => entry.role || entry.artist || entry.name),
      cast: this.cast.getRawValue()
        .map((entry: any) => ({
          character: entry.character,
          artists: entry.artist ? [entry.artist] : [],
          names: String(entry.namesText || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          order: Number(entry.order || 0),
        }))
        .filter((entry: any) => entry.character || entry.artists.length || entry.names.length),
    });
  }

  mediaLabel(item: any): string {
    return item.title || item.originalName || item.filename || item.url || this.getId(item);
  }

  artistLabel(item: any): string {
    const professions = Array.isArray(item.professions) && item.professions.length ? ` / ${item.professions.join(', ')}` : '';
    return `${item.displayName || item.name || this.getId(item)}${professions}`;
  }

  getId(value: any): string {
    return String(value?._id || value?.id || value || '');
  }

  toDateInput(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private removeEmpty(payload: Record<string, unknown>): Record<string, unknown> {
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === undefined) {
        delete payload[key];
      }
    });

    return payload;
  }
}
