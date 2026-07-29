import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CmsOption } from '../../../core/models/cms.models';
import { contentStatusLabel, productionTypeLabel } from '../../../core/models/cms-labels';
import { MediaSelectionResult, MediaSelectionValue } from '../../../core/models/media.models';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import {
  AdminContentLanguage,
  AdminLanguageTabsComponent,
} from '../../components/admin-language-tabs.component';
import { MediaPickerComponent } from '../../components/media-picker/media-picker.component';
import { RichTextEditorComponent } from '../../components/rich-text-editor/rich-text-editor.component';
import { SearchPickerComponent } from '../../components/search-picker/search-picker.component';
import { SeoFieldsComponent } from '../../components/seo-fields/seo-fields.component';

@Component({
  selector: 'app-admin-homepage-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AdminLanguageTabsComponent,
    MediaPickerComponent,
    RichTextEditorComponent,
    SearchPickerComponent,
    SeoFieldsComponent,
  ],
  templateUrl: './admin-homepage-config.component.html',
  styleUrl: './admin-homepage-config.component.scss',
})
export class AdminHomepageConfigComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cms = inject(CmsAdminService);
  private readonly notifications = inject(AdminNotificationService);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly slides = signal<CmsOption[]>([]);
  readonly events = signal<CmsOption[]>([]);
  readonly productions = signal<CmsOption[]>([]);
  readonly productionTypes = signal<CmsOption[]>([]);
  readonly news = signal<CmsOption[]>([]);
  readonly pages = signal<CmsOption[]>([]);
  readonly teaserImage = signal<MediaSelectionValue[]>([]);
  readonly activeLanguage = signal<AdminContentLanguage>('sr');
  readonly form = this.fb.group({
    hero: this.fb.group({
      enabled: [true],
      mode: ['automatic'],
      limit: [5],
      selectedSlides: this.fb.control<string[]>([]),
      fallbackToAutomatic: [true],
    }),
    upcomingEvents: this.fb.group({
      enabled: [true],
      mode: ['automatic'],
      heading: ['Repertoar'],
      limit: [8],
      selectedEvents: this.fb.control<string[]>([]),
      dateFrom: [''],
      dateTo: [''],
    }),
    repertoireProductions: this.fb.group({
      enabled: [true],
      mode: ['automatic'],
      heading: ['Sta je na repertoaru'],
      limit: [8],
      selectedProductions: this.fb.control<string[]>([]),
      allowedTypes: this.fb.control<string[]>([]),
    }),
    featuredProductions: this.fb.group({
      enabled: [true],
      mode: ['automatic'],
      heading: ['Predstave'],
      limit: [6],
      selectedProductions: this.fb.control<string[]>([]),
      allowedTypes: this.fb.control<string[]>([]),
    }),
    featuredNews: this.fb.group({
      enabled: [true],
      mode: ['automatic'],
      heading: ['Aktuelno'],
      limit: [6],
      selectedNews: this.fb.control<string[]>([]),
      category: [''],
    }),
    institutionalTeaser: this.fb.group({
      enabled: [true],
      heading: [''],
      text: [''],
      image: [''],
      ctaLabel: [''],
      ctaUrl: [''],
      linkedPage: [''],
    }),
    ctaCardsHeading: ['Istrazite Madlenianum'],
    ctaCards: this.fb.array<FormGroup>([]),
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
        upcomingEventsHeading: [''],
        repertoireProductionsHeading: [''],
        featuredProductionsHeading: [''],
        featuredNewsHeading: [''],
        institutionalTeaser: this.fb.group({
          heading: [''],
          text: [''],
          ctaLabel: [''],
        }),
        ctaCardsHeading: [''],
        seoTitle: [''],
        seoDescription: [''],
      }),
    }),
  });
  ngOnInit(): void {
    this.loadOptions();
    this.load();
  }
  get hero(): FormGroup {
    return this.form.controls.hero;
  }
  get upcoming(): FormGroup {
    return this.form.controls.upcomingEvents;
  }
  get repertoireProductions(): FormGroup {
    return this.form.controls.repertoireProductions;
  }
  get featuredProductions(): FormGroup {
    return this.form.controls.featuredProductions;
  }
  get featuredNews(): FormGroup {
    return this.form.controls.featuredNews;
  }
  get teaser(): FormGroup {
    return this.form.controls.institutionalTeaser;
  }
  get cards(): FormArray {
    return this.form.controls.ctaCards;
  }
  get sections(): FormArray {
    return this.form.controls.sections;
  }
  get seo(): FormGroup {
    return this.form.controls.seo;
  }
  get english(): FormGroup {
    return this.form.controls.translations.controls.en;
  }
  englishComplete(): boolean {
    const value = this.form.controls.translations.controls.en.getRawValue();
    return Boolean(
      value.upcomingEventsHeading?.trim() &&
      value.repertoireProductionsHeading?.trim() &&
      value.featuredProductionsHeading?.trim(),
    );
  }
  groups(array: FormArray): FormGroup[] {
    return array.controls as FormGroup[];
  }
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
  loadOptions(): void {
    this.cms.formOptions('homepage').subscribe({
      next: ({ options }) => {
        this.slides.set(
          this.options(options['slides'], 'title', (item) =>
            contentStatusLabel(String(item['status'] || '')),
          ),
        );
        this.events.set(
          this.options(
            options['events'],
            'startsAt',
            (item) =>
              `${this.obj(item['production'])['title'] || 'Termin'} / ${this.obj(item['venue'])['name'] || ''}`,
          ),
        );
        this.productions.set(
          this.options(
            options['productions'],
            'title',
            (item) =>
              `${productionTypeLabel(String(item['type'] || ''))} / ${contentStatusLabel(String(item['status'] || ''))}`,
          ),
        );
        this.productionTypes.set(this.optionValues(options['productionTypes']));
        this.news.set(
          this.options(
            options['news'],
            'title',
            (item) =>
              `${item['category'] || ''} / ${contentStatusLabel(String(item['status'] || ''))}`,
          ),
        );
        this.pages.set(
          this.options(options['pages'], 'title', (item) => String(item['pageType'] || '')),
        );
      },
      error: () => this.error.set('Opcije pocetne strane nisu ucitane.'),
    });
  }
  load(): void {
    this.loading.set(true);
    this.cms.getSingleton<Record<string, unknown>>('homepage-config').subscribe({
      next: ({ item }) => this.patch(item),
      error: (error) => this.error.set(error?.error?.message || 'Konfiguracija nije ucitana.'),
      complete: () => this.loading.set(false),
    });
  }
  patch(item: Record<string, unknown>): void {
    const hero = this.obj(item['hero']),
      up = this.obj(item['upcomingEvents']),
      rep = this.obj(item['repertoireProductions']),
      prod = this.obj(item['featuredProductions']),
      news = this.obj(item['featuredNews']),
      teaser = this.obj(item['institutionalTeaser']),
      seo = this.obj(item['seo']),
      translations = this.obj(item['translations']),
      english = this.obj(translations['en']),
      englishTeaser = this.obj(english['institutionalTeaser']),
      englishCards = this.objects(english['ctaCards']);
    this.form.patchValue({
      hero: {
        enabled: hero['enabled'] !== false,
        mode: String(hero['mode'] || 'automatic'),
        limit: Number(hero['limit'] || 5),
        selectedSlides: this.ids(hero['selectedSlides']),
        fallbackToAutomatic: hero['fallbackToAutomatic'] !== false,
      },
      upcomingEvents: {
        enabled: up['enabled'] !== false,
        mode: String(up['mode'] || 'automatic'),
        heading: String(up['heading'] || 'Repertoar'),
        limit: Number(up['limit'] || 8),
        selectedEvents: this.ids(up['selectedEvents']),
        dateFrom: this.date(up['dateFrom']),
        dateTo: this.date(up['dateTo']),
      },
      repertoireProductions: {
        enabled: rep['enabled'] !== false,
        mode: String(rep['mode'] || 'automatic'),
        heading: String(rep['heading'] || 'Sta je na repertoaru'),
        limit: Number(rep['limit'] || 8),
        selectedProductions: this.ids(rep['selectedProductions']),
        allowedTypes: Array.isArray(rep['allowedTypes']) ? rep['allowedTypes'].map(String) : [],
      },
      featuredProductions: {
        enabled: prod['enabled'] !== false,
        mode: String(prod['mode'] || 'automatic'),
        heading: String(prod['heading'] || 'Predstave'),
        limit: Number(prod['limit'] || 6),
        selectedProductions: this.ids(prod['selectedProductions']),
        allowedTypes: Array.isArray(prod['allowedTypes']) ? prod['allowedTypes'].map(String) : [],
      },
      featuredNews: {
        enabled: news['enabled'] !== false,
        mode: String(news['mode'] || 'automatic'),
        heading: String(news['heading'] || 'Aktuelno'),
        limit: Number(news['limit'] || 6),
        selectedNews: this.ids(news['selectedNews']),
        category: String(news['category'] || ''),
      },
      institutionalTeaser: {
        enabled: teaser['enabled'] !== false,
        heading: String(teaser['heading'] || ''),
        text: String(teaser['text'] || ''),
        image: this.id(teaser['image']),
        ctaLabel: String(teaser['ctaLabel'] || ''),
        ctaUrl: String(teaser['ctaUrl'] || ''),
        linkedPage: this.id(teaser['linkedPage']),
      },
      ctaCardsHeading: String(item['ctaCardsHeading'] || 'Istrazite Madlenianum'),
      seo: {
        title: String(seo['title'] || ''),
        description: String(seo['description'] || ''),
        keywords: Array.isArray(seo['keywords']) ? seo['keywords'].map(String) : [],
        canonicalUrl: String(seo['canonicalUrl'] || ''),
        noIndex: Boolean(seo['noIndex']),
      },
      translations: {
        en: {
          upcomingEventsHeading: String(english['upcomingEventsHeading'] || ''),
          repertoireProductionsHeading: String(english['repertoireProductionsHeading'] || ''),
          featuredProductionsHeading: String(english['featuredProductionsHeading'] || ''),
          featuredNewsHeading: String(english['featuredNewsHeading'] || ''),
          institutionalTeaser: {
            heading: String(englishTeaser['heading'] || ''),
            text: String(englishTeaser['text'] || ''),
            ctaLabel: String(englishTeaser['ctaLabel'] || ''),
          },
          ctaCardsHeading: String(english['ctaCardsHeading'] || ''),
          seoTitle: String(english['seoTitle'] || ''),
          seoDescription: String(english['seoDescription'] || ''),
        },
      },
    });
    this.teaserImage.set(teaser['image'] ? [teaser['image'] as MediaSelectionValue] : []);
    this.cards.clear();
    this.objects(item['ctaCards']).forEach((card, index) =>
      this.cards.push(this.cardGroup(card, index, this.translatedEntry(englishCards, card, index))),
    );
    this.sections.clear();
    const sectionValues = this.objects(item['sections']);
    (sectionValues.length ? sectionValues : this.defaultSections()).forEach((section, index) =>
      this.sections.push(this.sectionGroup(section, index)),
    );
    this.form.markAsPristine();
  }
  addCard(): void {
    this.cards.push(this.cardGroup({}, this.cards.length, {}));
    this.cards.markAsDirty();
  }
  remove(array: FormArray, index: number): void {
    array.removeAt(index);
    this.normalize(array);
  }
  move(array: FormArray, index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= array.length) return;
    const item = array.at(index);
    array.removeAt(index);
    array.insert(target, item);
    this.normalize(array);
  }
  cardImage(group: FormGroup): MediaSelectionValue[] {
    const value = group.get('image')?.value;
    return value ? [value] : [];
  }
  updateCardImage(group: FormGroup, selection: MediaSelectionResult): void {
    group.get('image')?.setValue(selection.ids[0] || '');
    group.markAsDirty();
  }
  updateTeaserImage(selection: MediaSelectionResult): void {
    this.teaserImage.set(selection.items.length ? selection.items : selection.ids);
    this.teaser.get('image')?.setValue(selection.ids[0] || '');
    this.teaser.markAsDirty();
  }
  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.error.set('Proverite obavezna polja.');
      return;
    }
    this.saving.set(true);
    this.cms.updateSingleton<Record<string, unknown>>('homepage-config', this.payload()).subscribe({
      next: ({ item }) => {
        this.notifications.success('Pocetna strana je sacuvana.');
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
    window.open(`/admin/homepage/preview?lang=${this.activeLanguage()}`, '_blank', 'noopener');
  }
  private payload(): Record<string, unknown> {
    const raw = this.form.getRawValue();
    const cardValues = this.objects(raw.ctaCards);
    const baseCards = cardValues
      .filter((card) => card['title'])
      .map((card, index) => {
        const { english: _english, sourceId: _sourceId, ...shared } = card;
        return { ...shared, image: card['image'] || null, displayOrder: index };
      });
    const englishCards = cardValues.map((card) => ({
      sourceId: card['sourceId'] || undefined,
      ...this.obj(card['english']),
    }));
    return {
      ...raw,
      upcomingEvents: {
        ...raw.upcomingEvents,
        dateFrom: this.iso(raw.upcomingEvents?.dateFrom),
        dateTo: this.iso(raw.upcomingEvents?.dateTo),
      },
      institutionalTeaser: {
        ...raw.institutionalTeaser,
        image: raw.institutionalTeaser?.image || null,
        linkedPage: raw.institutionalTeaser?.linkedPage || null,
      },
      ctaCards: baseCards,
      translations: {
        en: {
          ...raw.translations?.en,
          ctaCards: englishCards,
        },
      },
      sections: this.objects(raw.sections).map((section, index) => ({
        ...section,
        displayOrder: index,
      })),
    };
  }
  private cardGroup(
    value: Record<string, unknown>,
    index: number,
    english: Record<string, unknown>,
  ) {
    return this.fb.group({
      sourceId: [this.id(value)],
      title: [String(value['title'] || ''), Validators.required],
      text: [String(value['text'] || '')],
      image: [this.id(value['image'])],
      linkLabel: [String(value['linkLabel'] || '')],
      url: [String(value['url'] || '')],
      enabled: [value['enabled'] !== false],
      displayOrder: [index],
      english: this.fb.group({
        title: [String(english['title'] || '')],
        text: [String(english['text'] || '')],
        linkLabel: [String(english['linkLabel'] || '')],
      }),
    });
  }
  private sectionGroup(value: Record<string, unknown>, index: number) {
    return this.fb.group({
      sectionType: [String(value['sectionType'] || ''), Validators.required],
      enabled: [value['enabled'] !== false],
      displayOrder: [index],
    });
  }
  private defaultSections(): Record<string, unknown>[] {
    return [
      'hero',
      'upcomingEvents',
      'repertoireProductions',
      'featuredProductions',
      'featuredNews',
      'institutionalTeaser',
      'ctaCards',
    ].map((sectionType, index) => ({ sectionType, enabled: true, displayOrder: index }));
  }
  private normalize(array: FormArray): void {
    array.controls.forEach((item, index) => item.get('displayOrder')?.setValue(index));
    array.markAsDirty();
  }
  private options(
    value: unknown,
    labelKey: string,
    meta: (item: Record<string, unknown>) => string,
  ): CmsOption[] {
    return this.objects(value)
      .map((item) => ({
        id: this.id(item),
        label:
          labelKey === 'startsAt'
            ? new Date(String(item[labelKey])).toLocaleString('sr-RS')
            : String(item[labelKey] || ''),
        meta: meta(item),
      }))
      .filter((item) => item.id);
  }
  private optionValues(value: unknown): CmsOption[] {
    return this.objects(value)
      .map((item) => ({
        id: String(item['value'] || ''),
        label: String(item['label'] || item['value'] || ''),
      }))
      .filter((item) => item.id);
  }
  private id(value: unknown): string {
    if (typeof value === 'string') return value;
    const item = this.obj(value);
    return String(item['_id'] || item['id'] || '');
  }
  private ids(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => this.id(item)).filter(Boolean) : [];
  }
  private obj(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
  private objects(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value) ? value.map((item) => this.obj(item)) : [];
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
  private date(value: unknown): string {
    return value ? new Date(String(value)).toISOString().slice(0, 10) : '';
  }
  private iso(value: unknown): string | undefined {
    return value ? new Date(String(value)).toISOString() : undefined;
  }
}
