import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import {
  AdminContentLanguage,
  AdminLanguageTabsComponent,
} from '../../components/admin-language-tabs.component';
import {
  AboutSectionsEditorComponent,
  buildAboutSection,
} from '../../components/about-sections-editor/about-sections-editor.component';
import { SeoFieldsComponent } from '../../components/seo-fields/seo-fields.component';

@Component({
  selector: 'app-admin-about-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AdminLanguageTabsComponent,
    AboutSectionsEditorComponent,
    SeoFieldsComponent,
  ],
  templateUrl: './admin-about-form.component.html',
  styleUrl: './admin-about-form.component.scss',
})
export class AdminAboutFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cms = inject(CmsAdminService);
  private readonly notifications = inject(AdminNotificationService);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly activeLanguage = signal<AdminContentLanguage>('sr');
  readonly statuses = [
    ['draft', 'Nacrt'],
    ['published', 'Objavljeno'],
    ['archived', 'Arhivirano'],
  ];
  readonly form = this.fb.group({
    title: ['O nama', Validators.required],
    slug: ['o-nama', Validators.required],
    status: ['draft', Validators.required],
    publishedAt: [''],
    sections: this.fb.array<FormGroup>([]),
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
        sections: this.fb.array<FormGroup>([]),
        seoTitle: [''],
        seoDescription: [''],
      }),
    }),
  });
  ngOnInit(): void {
    this.load();
  }
  get sections() {
    return this.form.controls.sections;
  }
  get seo(): FormGroup {
    return this.form.controls.seo;
  }
  get english(): FormGroup {
    return this.form.controls.translations.controls.en;
  }
  get englishSections() {
    return this.form.controls.translations.controls.en.controls.sections;
  }
  englishComplete(): boolean {
    return Boolean(
      this.english.get('title')?.value?.trim() && this.english.get('slug')?.value?.trim(),
    );
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
    this.cms.getStructuredPage<Record<string, unknown>>('about').subscribe({
      next: ({ item }) => this.patch(item),
      error: (error) => this.error.set(error?.error?.message || 'About strana nije ucitana.'),
      complete: () => this.loading.set(false),
    });
  }
  patch(item: Record<string, unknown>): void {
    const seo = this.obj(item['seo']);
    const english = this.obj(this.obj(item['translations'])['en']);
    const baseSections = this.objects(item['sections']);
    const translatedSections = this.objects(english['sections']);
    this.form.patchValue({
      title: String(item['title'] || 'O nama'),
      slug: String(item['slug'] || 'o-nama'),
      status: String(item['status'] || 'draft'),
      publishedAt: this.dateTime(item['publishedAt']),
      seo: {
        title: String(seo['title'] || ''),
        description: String(seo['description'] || ''),
        keywords: Array.isArray(seo['keywords']) ? seo['keywords'].map(String) : [],
        canonicalUrl: String(seo['canonicalUrl'] || ''),
        noIndex: Boolean(seo['noIndex']),
      },
      translations: {
        en: {
          title: String(english['title'] || ''),
          slug: String(english['slug'] || ''),
          seoTitle: String(english['seoTitle'] || ''),
          seoDescription: String(english['seoDescription'] || ''),
        },
      },
    });
    this.sections.clear();
    baseSections.forEach((section, index) =>
      this.sections.push(buildAboutSection(this.fb, section, index)),
    );
    this.englishSections.clear();
    baseSections.forEach((section, index) =>
      this.englishSections.push(
        buildAboutSection(
          this.fb,
          this.mergeTranslatedSection(section, translatedSections, index),
          index,
          true,
        ),
      ),
    );
    this.form.markAsPristine();
  }
  save(status?: 'draft' | 'published'): void {
    if (status) this.form.controls.status.setValue(status);
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.error.set('Proverite obavezna polja u sekcijama.');
      return;
    }
    this.saving.set(true);
    this.cms.updateStructuredPage<Record<string, unknown>>('about', this.payload()).subscribe({
      next: ({ item }) => {
        this.notifications.success('About strana je sacuvana.');
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
    window.open(`/admin/pages/about/preview?lang=${this.activeLanguage()}`, '_blank', 'noopener');
  }
  private payload(): Record<string, unknown> {
    const raw = this.form.getRawValue();
    const english = this.obj(raw.translations?.en);
    return {
      ...raw,
      pageType: 'about',
      publishedAt: raw.publishedAt ? new Date(raw.publishedAt).toISOString() : undefined,
      sections: this.objects(raw.sections).map((section, index) => ({
        ...section,
        image: section['image'] || null,
        backgroundImage: section['backgroundImage'] || null,
        displayOrder: index,
        timelineItems: this.objects(section['timelineItems']).map((item, itemIndex) => ({
          ...item,
          image: item['image'] || null,
          displayOrder: itemIndex,
        })),
        featureItems: this.objects(section['featureItems']).map((item, itemIndex) => ({
          ...item,
          image: item['image'] || null,
          displayOrder: itemIndex,
        })),
        galleryItems: this.objects(section['galleryItems']).map((item, itemIndex) => ({
          ...item,
          media: this.id(item['media']),
          displayOrder: itemIndex,
        })),
      })),
      translations: {
        en: {
          ...english,
          sections: this.objects(english['sections']).map((section, index) =>
            this.translationSectionPayload(section, index),
          ),
        },
      },
    };
  }
  private mergeTranslatedSection(
    base: Record<string, unknown>,
    translations: Record<string, unknown>[],
    index: number,
  ): Record<string, unknown> {
    const translated = this.translatedEntry(translations, base, index);
    const baseTimeline = this.objects(base['timelineItems']);
    const translatedTimeline = this.objects(translated['timelineItems']);
    const baseFeatures = this.objects(base['featureItems']);
    const translatedFeatures = this.objects(translated['featureItems']);
    return {
      ...base,
      ...translated,
      sourceId: this.id(base),
      sectionType: base['sectionType'],
      enabled: base['enabled'],
      image: base['image'],
      backgroundImage: base['backgroundImage'],
      imagePosition: base['imagePosition'],
      ctaUrl: base['ctaUrl'],
      videoUrl: base['videoUrl'],
      timelineItems: baseTimeline.map((entry, entryIndex) => ({
        ...entry,
        ...this.translatedEntry(translatedTimeline, entry, entryIndex),
        sourceId: this.id(entry),
        image: entry['image'],
      })),
      featureItems: baseFeatures.map((entry, entryIndex) => ({
        ...entry,
        ...this.translatedEntry(translatedFeatures, entry, entryIndex),
        sourceId: this.id(entry),
        iconKey: entry['iconKey'],
        image: entry['image'],
      })),
      galleryItems: base['galleryItems'],
    };
  }
  private translationSectionPayload(section: Record<string, unknown>, index: number) {
    return {
      sourceId: section['sourceId'] || undefined,
      sectionType: section['sectionType'],
      heading: section['heading'],
      eyebrow: section['eyebrow'],
      subtitle: section['subtitle'],
      body: section['body'],
      caption: section['caption'],
      ctaLabel: section['ctaLabel'],
      videoTitle: section['videoTitle'],
      quote: section['quote'],
      authorName: section['authorName'],
      authorRole: section['authorRole'],
      timelineItems: this.objects(section['timelineItems']).map((entry) => ({
        sourceId: entry['sourceId'] || undefined,
        period: entry['period'],
        title: entry['title'],
        description: entry['description'],
      })),
      featureItems: this.objects(section['featureItems']).map((entry) => ({
        sourceId: entry['sourceId'] || undefined,
        title: entry['title'],
        description: entry['description'],
      })),
      galleryItems: this.objects(section['galleryItems']).map((entry) => ({
        sourceId: entry['sourceId'] || undefined,
        caption: entry['caption'],
        credit: entry['credit'],
        altText: entry['altText'],
      })),
      displayOrder: index,
    };
  }
  private translatedEntry(
    translations: Record<string, unknown>[],
    source: Record<string, unknown>,
    index: number,
  ): Record<string, unknown> {
    const sourceId = this.id(source);
    return (
      translations.find((entry) => String(entry['sourceId'] || '') === sourceId) ||
      translations[index] ||
      {}
    );
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
  private dateTime(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
