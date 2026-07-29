import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GalleryItemInput } from '../../../core/models/cms.models';
import { MediaSelectionResult, MediaSelectionValue } from '../../../core/models/media.models';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import {
  AdminContentLanguage,
  AdminLanguageTabsComponent,
} from '../../components/admin-language-tabs.component';
import { MediaPickerComponent } from '../../components/media-picker/media-picker.component';
import { RichTextEditorComponent } from '../../components/rich-text-editor/rich-text-editor.component';
import { SeoFieldsComponent } from '../../components/seo-fields/seo-fields.component';
import { StructuredGalleryEditorComponent } from '../../components/structured-gallery-editor/structured-gallery-editor.component';
import { TagEditorComponent } from '../../components/tag-editor/tag-editor.component';

@Component({
  selector: 'app-admin-contact-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AdminLanguageTabsComponent,
    MediaPickerComponent,
    RichTextEditorComponent,
    StructuredGalleryEditorComponent,
    TagEditorComponent,
    SeoFieldsComponent,
  ],
  templateUrl: './admin-contact-form.component.html',
  styleUrl: './admin-contact-form.component.scss',
})
export class AdminContactFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cms = inject(CmsAdminService);
  private readonly notifications = inject(AdminNotificationService);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly imageSelection = signal<MediaSelectionValue[]>([]);
  readonly activeLanguage = signal<AdminContentLanguage>('sr');
  readonly statuses = [
    ['draft', 'Nacrt'],
    ['published', 'Objavljeno'],
    ['archived', 'Arhivirano'],
  ];
  readonly types = [
    ['text', 'Tekst'],
    ['phone', 'Telefon'],
    ['email', 'Email'],
    ['url', 'URL'],
  ];
  readonly form = this.fb.group({
    title: ['Kontakt', Validators.required],
    slug: ['kontakt', Validators.required],
    status: ['draft', Validators.required],
    publishedAt: [''],
    image: [''],
    galleryItems: this.fb.control<GalleryItemInput[]>([]),
    contact: this.fb.group({
      introduction: [''],
      mapUrl: [''],
      officeHours: [''],
      ticketOfficeHours: [''],
      additionalItems: this.fb.array<FormGroup>([]),
      contactFormEnabled: [true],
      recipientEmails: this.fb.control<string[]>([]),
    }),
    seo: this.fb.group({
      title: [''],
      description: [''],
      keywords: this.fb.control<string[]>([]),
      canonicalUrl: [''],
      noIndex: [false],
    }),
    translations: this.fb.group({
      en: this.fb.group({
        title: [''],
        slug: [''],
        contact: this.fb.group({
          introduction: [''],
          officeHours: [''],
          ticketOfficeHours: [''],
          additionalItems: this.fb.array<FormGroup>([]),
        }),
        seoTitle: [''],
        seoDescription: [''],
      }),
    }),
  });
  ngOnInit(): void {
    this.load();
  }
  get contact(): FormGroup {
    return this.form.controls.contact;
  }
  get items(): FormArray {
    return this.contact.get('additionalItems') as FormArray;
  }
  get seo(): FormGroup {
    return this.form.controls.seo;
  }
  get english(): FormGroup {
    return this.form.controls.translations.controls.en;
  }
  get englishContact(): FormGroup {
    return this.form.controls.translations.controls.en.controls.contact;
  }
  get englishItems(): FormArray {
    return this.englishContact.get('additionalItems') as FormArray;
  }
  englishRows(): FormGroup[] {
    return this.englishItems.controls as FormGroup[];
  }
  englishComplete(): boolean {
    return Boolean(
      this.english.get('title')?.value?.trim() && this.english.get('slug')?.value?.trim(),
    );
  }
  rows(): FormGroup[] {
    return this.items.controls as FormGroup[];
  }
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.cms.getStructuredPage<Record<string, unknown>>('contact').subscribe({
      next: ({ item }) => this.patch(item),
      error: (error) => this.error.set(error?.error?.message || 'Kontakt strana nije ucitana.'),
      complete: () => this.loading.set(false),
    });
  }
  patch(item: Record<string, unknown>): void {
    const contact = this.obj(item['contact']);
    const seo = this.obj(item['seo']);
    const english = this.obj(this.obj(item['translations'])['en']);
    const englishContact = this.obj(english['contact']);
    const translatedItems = this.objects(englishContact['additionalItems']);
    this.form.patchValue({
      title: String(item['title'] || 'Kontakt'),
      slug: String(item['slug'] || 'kontakt'),
      status: String(item['status'] || 'draft'),
      publishedAt: this.dateTime(item['publishedAt']),
      image: this.id(item['image']),
      galleryItems: this.gallery(item),
      contact: {
        introduction: String(contact['introduction'] || ''),
        mapUrl: String(contact['mapUrl'] || ''),
        officeHours: String(contact['officeHours'] || ''),
        ticketOfficeHours: String(contact['ticketOfficeHours'] || ''),
        contactFormEnabled: contact['contactFormEnabled'] !== false,
        recipientEmails: this.strings(contact['recipientEmails']),
      },
      seo: {
        title: String(seo['title'] || ''),
        description: String(seo['description'] || ''),
        keywords: this.strings(seo['keywords']),
        canonicalUrl: String(seo['canonicalUrl'] || ''),
        noIndex: Boolean(seo['noIndex']),
      },
      translations: {
        en: {
          title: String(english['title'] || ''),
          slug: String(english['slug'] || ''),
          contact: {
            introduction: String(englishContact['introduction'] || ''),
            officeHours: String(englishContact['officeHours'] || ''),
            ticketOfficeHours: String(englishContact['ticketOfficeHours'] || ''),
          },
          seoTitle: String(english['seoTitle'] || ''),
          seoDescription: String(english['seoDescription'] || ''),
        },
      },
    });
    this.imageSelection.set(item['image'] ? [item['image'] as MediaSelectionValue] : []);
    this.items.clear();
    const baseItems = this.objects(contact['additionalItems']);
    baseItems.forEach((entry, index) => this.items.push(this.itemGroup(entry, index)));
    this.englishItems.clear();
    baseItems.forEach((entry, index) =>
      this.englishItems.push(
        this.itemGroup(this.mergedTranslatedItem(entry, translatedItems, index), index, true),
      ),
    );
    this.form.markAsPristine();
  }
  addItem(): void {
    this.items.push(this.itemGroup({}, this.items.length));
    this.englishItems.push(this.itemGroup({}, this.englishItems.length, true));
    this.items.markAsDirty();
  }
  removeItem(index: number): void {
    this.items.removeAt(index);
    this.englishItems.removeAt(index);
    this.normalize();
  }
  move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.items.length) return;
    const item = this.items.at(index);
    this.items.removeAt(index);
    this.items.insert(target, item);
    const englishItem = this.englishItems.at(index);
    this.englishItems.removeAt(index);
    this.englishItems.insert(target, englishItem);
    this.normalize();
  }
  save(status?: 'draft' | 'published'): void {
    if (status) this.form.controls.status.setValue(status);
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.error.set('Proverite obavezna polja.');
      return;
    }
    this.saving.set(true);
    this.cms.updateStructuredPage<Record<string, unknown>>('contact', this.payload()).subscribe({
      next: ({ item }) => {
        this.notifications.success('Kontakt strana je sacuvana.');
        this.patch(item);
      },
      error: (error) => {
        const message = error?.error?.message || 'Cuvanje nije uspelo.';
        this.error.set(message);
        this.notifications.error(message);
      },
      complete: () => this.saving.set(false),
    });
  }
  preview(): void {
    window.open(`/admin/pages/contact/preview?lang=${this.activeLanguage()}`, '_blank', 'noopener');
  }
  updateImage(selection: MediaSelectionResult): void {
    this.imageSelection.set(selection.items.length ? selection.items : selection.ids);
    this.form.controls.image.setValue(selection.ids[0] || '');
    this.form.controls.image.markAsDirty();
  }
  private payload(): Record<string, unknown> {
    const raw = this.form.getRawValue();
    const english = this.obj(raw.translations?.en);
    const englishContact = this.obj(english['contact']);
    return {
      ...raw,
      pageType: 'contact',
      publishedAt: raw.publishedAt ? new Date(raw.publishedAt).toISOString() : undefined,
      image: raw.image || null,
      galleryItems: (raw.galleryItems || []).map((item, index) => ({
        ...item,
        media: this.id(item.media),
        displayOrder: index,
      })),
      contact: {
        ...raw.contact,
        additionalItems: this.objects(raw.contact?.additionalItems)
          .filter((item) => item['label'] && item['value'])
          .map((item, index) => {
            const { sourceId: _sourceId, ...value } = item;
            return { ...value, displayOrder: index };
          }),
      },
      translations: {
        en: {
          ...english,
          contact: {
            ...englishContact,
            additionalItems: this.objects(englishContact['additionalItems']).map((item) => ({
              sourceId: item['sourceId'] || undefined,
              label: item['label'],
              value: item['value'],
            })),
          },
        },
      },
    };
  }
  private itemGroup(value: Record<string, unknown>, index: number, translationMode = false) {
    return this.fb.group({
      sourceId: [String(value['sourceId'] || this.id(value))],
      label: [String(value['label'] || ''), translationMode ? [] : [Validators.required]],
      value: [String(value['value'] || ''), translationMode ? [] : [Validators.required]],
      type: [String(value['type'] || 'text')],
      link: [String(value['link'] || '')],
      displayOrder: [index],
    });
  }
  private mergedTranslatedItem(
    base: Record<string, unknown>,
    translations: Record<string, unknown>[],
    index: number,
  ): Record<string, unknown> {
    const sourceId = this.id(base);
    const translated =
      translations.find((entry) => String(entry['sourceId'] || '') === sourceId) ||
      translations[index] ||
      {};
    return { ...base, ...translated, sourceId, type: base['type'], link: base['link'] };
  }
  private normalize(): void {
    this.items.controls.forEach((item, index) => item.get('displayOrder')?.setValue(index));
    this.items.markAsDirty();
  }
  private gallery(item: Record<string, unknown>): GalleryItemInput[] {
    const values = this.objects(item['galleryItems']);
    if (values.length)
      return values.map((entry, index) => ({
        media: entry['media'] as MediaSelectionValue,
        caption: String(entry['caption'] || ''),
        credit: String(entry['credit'] || ''),
        altText: String(entry['altText'] || ''),
        translations: entry['translations'] as GalleryItemInput['translations'],
        displayOrder: Number(entry['displayOrder'] ?? index),
      }));
    return [];
  }
  private id(value: unknown): string {
    if (typeof value === 'string') return value;
    const item = this.obj(value);
    return String(item['_id'] || item['id'] || '');
  }
  private obj(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
  private objects(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value) ? value.map((item) => this.obj(item)) : [];
  }
  private strings(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }
  private dateTime(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
