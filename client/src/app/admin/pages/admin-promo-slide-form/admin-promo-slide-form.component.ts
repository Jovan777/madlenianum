import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { contentStatusLabel, productionTypeLabel } from '../../../core/models/cms-labels';
import { CmsOption } from '../../../core/models/cms.models';
import { MediaSelectionResult, MediaSelectionValue } from '../../../core/models/media.models';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { MediaPickerComponent } from '../../components/media-picker/media-picker.component';
import { SearchPickerComponent } from '../../components/search-picker/search-picker.component';

@Component({
  selector: 'app-admin-promo-slide-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MediaPickerComponent, SearchPickerComponent],
  templateUrl: './admin-promo-slide-form.component.html',
  styleUrl: './admin-promo-slide-form.component.scss',
})
export class AdminPromoSlideFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cms = inject(CmsAdminService);
  private readonly notifications = inject(AdminNotificationService);
  readonly itemId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly imageSelection = signal<MediaSelectionValue[]>([]);
  readonly productions = signal<CmsOption[]>([]);
  readonly events = signal<CmsOption[]>([]);
  readonly statuses = signal<Array<{ value: string; label: string }>>([]);
  readonly languages = signal<Array<{ value: string; label: string }>>([]);
  readonly form = this.fb.group({
    title: ['', Validators.required], slug: [''], subtitle: [''], description: [''], image: [''],
    linkLabel: [''], linkUrl: [''], relatedProduction: [''], relatedEvent: [''],
    activeFrom: [''], activeUntil: [''], language: ['sr'], status: ['draft'], publishedAt: [''],
  });

  ngOnInit(): void { const id = this.route.snapshot.paramMap.get('id'); this.itemId.set(id); this.loadOptions(); if (id) this.loadItem(id); }
  get isEditMode(): boolean { return Boolean(this.itemId()); }
  statusLabel(): string { return contentStatusLabel(this.form.controls.status.value || undefined); }
  hasUnsavedChanges(): boolean { return this.form.dirty && !this.saving(); }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void { if (this.hasUnsavedChanges()) event.preventDefault(); }

  loadOptions(): void {
    this.cms.formOptions('promo-slide').subscribe({
      next: ({ options }) => {
        this.statuses.set(this.pairs(options['statuses'])); this.languages.set(this.pairs(options['languages']));
        this.productions.set(this.objects(options['productions']).map((item) => ({ id: this.id(item), label: String(item['title'] || ''), meta: `${productionTypeLabel(String(item['type'] || ''))} / ${contentStatusLabel(String(item['status'] || ''))}` })));
        this.events.set(this.objects(options['events']).map((item) => ({ id: this.id(item), label: new Date(String(item['startsAt'])).toLocaleString('sr-RS'), meta: `${this.obj(item['production'])['title'] || 'Termin'} / ${this.obj(item['venue'])['name'] || ''}` })));
      },
      error: () => this.error.set('Opcije forme nisu ucitane.'),
    });
  }

  loadItem(id: string): void {
    this.loading.set(true); this.error.set('');
    this.cms.get<Record<string, unknown>>('promo-slides', id).subscribe({
      next: ({ item }) => this.patch(item),
      error: (error) => this.error.set(error?.error?.message || 'Slajd nije ucitan.'),
      complete: () => this.loading.set(false),
    });
  }

  patch(item: Record<string, unknown>): void {
    this.form.patchValue({ title: String(item['title'] || ''), slug: String(item['slug'] || ''), subtitle: String(item['subtitle'] || ''), description: String(item['description'] || ''), image: this.id(item['image']), linkLabel: String(item['linkLabel'] || ''), linkUrl: String(item['linkUrl'] || ''), relatedProduction: this.id(item['relatedProduction']), relatedEvent: this.id(item['relatedEvent']), activeFrom: this.dateTime(item['activeFrom']), activeUntil: this.dateTime(item['activeUntil']), language: String(item['language'] || 'sr'), status: String(item['status'] || 'draft'), publishedAt: this.dateTime(item['publishedAt']) });
    this.imageSelection.set(item['image'] ? [item['image'] as MediaSelectionValue] : []); this.form.markAsPristine();
  }

  updateImage(selection: MediaSelectionResult): void { this.imageSelection.set(selection.items.length ? selection.items : selection.ids); this.form.controls.image.setValue(selection.ids[0] || ''); this.form.controls.image.markAsDirty(); }
  preview(): void { if (this.itemId()) window.open(`/admin/promo-slides/${this.itemId()}/preview`, '_blank', 'noopener'); }
  save(status?: 'draft' | 'published'): void {
    if (status) this.form.controls.status.setValue(status);
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); this.error.set('Naslov je obavezan.'); return; }
    this.saving.set(true); const id = this.itemId(); const request = id ? this.cms.update<Record<string, unknown>>('promo-slides', id, this.payload()) : this.cms.create<Record<string, unknown>>('promo-slides', this.payload());
    request.subscribe({ next: ({ item }) => { const savedId = this.id(item); this.notifications.success('Promo slajd je sacuvan.'); this.patch(item); if (!id && savedId) this.router.navigate(['/admin/promo-slides', savedId, 'edit'], { replaceUrl: true }); }, error: (error) => { const message = error?.error?.message || 'Cuvanje nije uspelo.'; this.error.set(message); this.notifications.error(message); }, complete: () => this.saving.set(false) });
  }

  private payload(): Record<string, unknown> { const raw = this.form.getRawValue(); return { ...raw, image: raw.image || null, relatedProduction: raw.relatedProduction || null, relatedEvent: raw.relatedEvent || null, activeFrom: this.iso(raw.activeFrom), activeUntil: this.iso(raw.activeUntil), publishedAt: this.iso(raw.publishedAt) }; }
  private pairs(value: unknown): Array<{ value: string; label: string }> { return this.objects(value).map((item) => ({ value: String(item['value'] || ''), label: String(item['label'] || item['value'] || '') })); }
  private id(value: unknown): string { if (typeof value === 'string') return value; const item = this.obj(value); return String(item['_id'] || item['id'] || ''); }
  private obj(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
  private objects(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map((item) => this.obj(item)) : []; }
  private dateTime(value: unknown): string { if (!value) return ''; const date = new Date(String(value)); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
  private iso(value: unknown): string | undefined { return value ? new Date(String(value)).toISOString() : undefined; }
}
