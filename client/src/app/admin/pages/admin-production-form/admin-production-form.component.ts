import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CmsOption, GalleryItemInput } from '../../../core/models/cms.models';
import { contentStatusLabel, productionTypeLabel } from '../../../core/models/cms-labels';
import { MediaSelectionResult, MediaSelectionValue } from '../../../core/models/media.models';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { AdminContentLanguage, AdminLanguageTabsComponent } from '../../components/admin-language-tabs.component';
import { CastEditorComponent } from '../../components/cast-editor/cast-editor.component';
import { CreativeTeamEditorComponent } from '../../components/creative-team-editor/creative-team-editor.component';
import { MediaPickerComponent } from '../../components/media-picker/media-picker.component';
import { RecommendedProductionsPickerComponent } from '../../components/recommended-productions-picker/recommended-productions-picker.component';
import { ReviewLinksEditorComponent } from '../../components/review-links-editor/review-links-editor.component';
import { RichTextEditorComponent } from '../../components/rich-text-editor/rich-text-editor.component';
import { SeoFieldsComponent } from '../../components/seo-fields/seo-fields.component';
import { StructuredGalleryEditorComponent } from '../../components/structured-gallery-editor/structured-gallery-editor.component';
import { TagEditorComponent } from '../../components/tag-editor/tag-editor.component';
import { VideoLinksEditorComponent } from '../../components/video-links-editor/video-links-editor.component';

@Component({
  selector: 'app-admin-production-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AdminLanguageTabsComponent, MediaPickerComponent, RichTextEditorComponent, TagEditorComponent, StructuredGalleryEditorComponent, SeoFieldsComponent, CreativeTeamEditorComponent, CastEditorComponent, VideoLinksEditorComponent, ReviewLinksEditorComponent, RecommendedProductionsPickerComponent],
  templateUrl: './admin-production-form.component.html',
  styleUrl: './admin-production-form.component.scss',
})
export class AdminProductionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cms = inject(CmsAdminService);
  private readonly notifications = inject(AdminNotificationService);

  readonly itemId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly posterSelection = signal<MediaSelectionValue[]>([]);
  readonly announcementSelection = signal<MediaSelectionValue[]>([]);
  readonly artistOptions = signal<CmsOption[]>([]);
  readonly productionOptions = signal<CmsOption[]>([]);
  readonly productionTypes = signal<Array<{ value: string; label: string }>>([]);
  readonly statuses = signal<Array<{ value: string; label: string }>>([]);
  readonly creativeRoles = signal<Array<{ value: string; label: string }>>([]);
  readonly videoProviders = signal<Array<{ value: string; label: string }>>([]);
  readonly venueOptions = signal<Array<{ id: string; label: string }>>([]);
  readonly activeLanguage = signal<AdminContentLanguage>('sr');
  private originalSlug = '';
  private originalStatus = 'draft';

  readonly form = this.fb.group({
    title: ['', Validators.required], slug: [''], type: ['drama', Validators.required], authorComposer: [''], originalTitle: [''], subtitle: [''], season: [''], premiereDate: [''], venue: [''], durationMinutes: [null as number | null], performanceLanguage: ['sr'], subtitles: [''],
    tags: this.fb.control<string[]>([]), shortDescription: [''], description: [''], synopsis: [''], poster: [''], galleryItems: this.fb.control<GalleryItemInput[]>([]),
    status: ['draft', Validators.required], publishedAt: [''], isPremiere: [false], isOnRepertoire: [true], isFeatured: [false],
    creativeTeam: this.fb.array<FormGroup>([]), cast: this.fb.array<FormGroup>([]), videos: this.fb.array<FormGroup>([]), reviews: this.fb.array<FormGroup>([]), recommendedProductions: this.fb.control<string[]>([]),
    announcement: this.fb.group({ isAnnounced: [false], month: [null as number | null], year: [new Date().getFullYear()], text: [''], image: [''], startsAt: [''], endsAt: [''] }),
    seo: this.fb.group({ title: [''], description: [''], keywords: this.fb.control<string[]>([]), canonicalUrl: [''], noIndex: [false] }),
    translations: this.fb.group({
      en: this.fb.group({
        title: [''], slug: [''], authorComposer: [''], originalTitle: [''], subtitle: [''],
        season: [''], performanceLanguage: [''], subtitles: [''], tags: this.fb.control<string[]>([]),
        shortDescription: [''], description: [''], synopsis: [''], announcementText: [''],
        seoTitle: [''], seoDescription: [''],
      }),
    }),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.itemId.set(id);
    this.loadOptions();
    if (id) this.loadProduction(id);
  }

  get isEditMode(): boolean { return Boolean(this.itemId()); }
  get creativeTeam(): FormArray { return this.form.controls.creativeTeam; }
  get cast(): FormArray { return this.form.controls.cast; }
  get videos(): FormArray { return this.form.controls.videos; }
  get reviews(): FormArray { return this.form.controls.reviews; }
  get announcement(): FormGroup { return this.form.controls.announcement; }
  get seo(): FormGroup { return this.form.controls.seo; }
  get english(): FormGroup { return this.form.controls.translations.controls.en; }
  englishComplete(): boolean {
    const value = this.form.controls.translations.controls.en.getRawValue();
    return Boolean(value.title?.trim() && value.slug?.trim());
  }

  hasUnsavedChanges(): boolean { return this.form.dirty && !this.isSaving(); }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void { if (this.hasUnsavedChanges()) event.preventDefault(); }

  loadOptions(): void {
    this.cms.formOptions('production').subscribe({
      next: ({ options }) => {
        const currentId = this.itemId();
        this.artistOptions.set(this.toOptions(options['artists'], 'displayName', (item) => this.arrayText(item['professions'])));
        this.productionOptions.set(this.toOptions(options['productions'], 'title', (item) => `${productionTypeLabel(String(item['type'] || ''))} / ${contentStatusLabel(String(item['status'] || ''))}`).filter((item) => item.id !== currentId));
        this.productionTypes.set(this.optionPairs(options['productionTypes']));
        this.statuses.set(this.optionPairs(options['statuses']));
        this.creativeRoles.set(this.optionPairs(options['creativeRoles']));
        this.videoProviders.set(this.optionPairs(options['videoProviders']));
        this.venueOptions.set(this.toOptions(options['venues'], 'name').map(({ id, label }) => ({ id, label })));
      },
      error: () => this.errorMessage.set('Opcije forme nisu ucitane. Pokusajte ponovo.'),
    });
  }

  loadProduction(id: string): void {
    this.isLoading.set(true); this.errorMessage.set('');
    this.cms.get<Record<string, unknown>>('productions', id).subscribe({
      next: ({ item }) => this.patchProduction(item),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Predstava nije ucitana.'),
      complete: () => this.isLoading.set(false),
    });
  }

  patchProduction(item: Record<string, unknown>): void {
    this.originalSlug = String(item['slug'] || ''); this.originalStatus = String(item['status'] || 'draft');
    const announcement = this.object(item['announcement']); const seo = this.object(item['seo']);
    const translations = this.object(item['translations']); const english = this.object(translations['en']);
    this.form.patchValue({
      title:String(item['title']||''),slug:this.originalSlug,type:String(item['type']||'drama'),authorComposer:String(item['authorComposer']||''),originalTitle:String(item['originalTitle']||''),subtitle:String(item['subtitle']||''),season:String(item['season']||''),premiereDate:this.dateInput(item['premiereDate']),venue:this.idOf(item['venue']),durationMinutes:this.numberOrNull(item['durationMinutes']),performanceLanguage:String(item['performanceLanguage']||'sr'),subtitles:String(item['subtitles']||''),
      tags:this.stringArray(item['tags']),shortDescription:String(item['shortDescription']||''),description:String(item['description']||''),synopsis:String(item['synopsis']||''),poster:this.idOf(item['poster']),galleryItems:this.galleryValue(item),status:this.originalStatus,publishedAt:this.dateTimeInput(item['publishedAt']),isPremiere:Boolean(item['isPremiere']),isOnRepertoire:item['isOnRepertoire']!==false,isFeatured:Boolean(item['isFeatured']),recommendedProductions:this.idArray(item['recommendedProductions']),
      announcement:{isAnnounced:Boolean(announcement['isAnnounced']),month:this.numberOrNull(announcement['month']),year:this.numberOrNull(announcement['year'])||new Date().getFullYear(),text:String(announcement['text']||''),image:this.idOf(announcement['image']),startsAt:this.dateTimeInput(announcement['startsAt']),endsAt:this.dateTimeInput(announcement['endsAt'])},
      seo:{title:String(seo['title']||''),description:String(seo['description']||''),keywords:this.stringArray(seo['keywords']),canonicalUrl:String(seo['canonicalUrl']||''),noIndex:Boolean(seo['noIndex'])},
      translations:{en:{
        title:String(english['title']||''),slug:String(english['slug']||''),authorComposer:String(english['authorComposer']||''),originalTitle:String(english['originalTitle']||''),subtitle:String(english['subtitle']||''),
        season:String(english['season']||''),performanceLanguage:String(english['performanceLanguage']||''),subtitles:String(english['subtitles']||''),tags:this.stringArray(english['tags']),
        shortDescription:String(english['shortDescription']||''),description:String(english['description']||''),synopsis:String(english['synopsis']||''),announcementText:String(english['announcementText']||''),
        seoTitle:String(english['seoTitle']||''),seoDescription:String(english['seoDescription']||''),
      }},
    });
    this.posterSelection.set(item['poster'] ? [item['poster'] as MediaSelectionValue] : []);
    this.announcementSelection.set(announcement['image'] ? [announcement['image'] as MediaSelectionValue] : []);
    this.replaceArray(this.creativeTeam, this.array(item['creativeTeam']), (entry, index) => this.creditGroup(entry, index));
    this.replaceArray(this.cast, this.normalizeCast(this.array(item['cast'])), (entry, index) => this.castGroup(entry, index));
    this.replaceArray(this.videos, this.array(item['videos']), (entry, index) => this.videoGroup(entry, index));
    this.replaceArray(this.reviews, this.array(item['reviews']), (entry, index) => this.reviewGroup(entry, index));
    this.form.markAsPristine();
  }

  save(status?: 'draft' | 'published'): void {
    if (status) this.form.controls.status.setValue(status);
    if (this.form.invalid || this.isSaving()) { this.form.markAllAsTouched(); this.errorMessage.set('Proverite obavezna polja i neispravne linkove.'); return; }
    const slug = this.form.controls.slug.value || '';
    if (this.originalStatus === 'published' && this.originalSlug && slug && slug !== this.originalSlug && !window.confirm('Promena sluga moze prekinuti postojece javne linkove. Nastaviti?')) return;
    this.isSaving.set(true); this.errorMessage.set('');
    const id = this.itemId(); const request = id ? this.cms.update<Record<string, unknown>>('productions', id, this.buildPayload()) : this.cms.create<Record<string, unknown>>('productions', this.buildPayload());
    request.subscribe({
      next: ({ item }) => { const savedId=this.idOf(item); this.notifications.success('Predstava je sacuvana.'); this.form.markAsPristine(); if(!id&&savedId){this.router.navigate(['/admin/productions',savedId,'edit']);} else {this.patchProduction(item);} },
      error: (error) => { const message=error?.error?.message||'Cuvanje predstave nije uspelo.';this.errorMessage.set(message);this.notifications.error(message); },
      complete:()=>this.isSaving.set(false),
    });
  }

  preview(): void { const id=this.itemId(); if(!id){this.notifications.info('Prvo sacuvajte nacrt, zatim otvorite pregled.');return;} window.open(`/admin/productions/${id}/preview?lang=${this.activeLanguage()}`,'_blank','noopener'); }
  updatePoster(selection: MediaSelectionResult): void { this.posterSelection.set(selection.items.length?selection.items:selection.ids);this.form.controls.poster.setValue(selection.ids[0]||'');this.form.controls.poster.markAsDirty(); }
  updateAnnouncementImage(selection: MediaSelectionResult): void { this.announcementSelection.set(selection.items.length?selection.items:selection.ids);this.announcement.get('image')?.setValue(selection.ids[0]||'');this.announcement.markAsDirty(); }
  statusLabel(value:string|undefined|null):string{return contentStatusLabel(value||undefined);}

  buildPayload(): Record<string, unknown> {
    const raw=this.form.getRawValue();
    return {...raw,premiereDate:this.iso(raw.premiereDate),publishedAt:this.iso(raw.publishedAt),poster:raw.poster||null,galleryItems:(raw.galleryItems||[]).map((item,index)=>({...item,media:this.idOf(item.media),displayOrder:index})),venue:raw.venue||null,durationMinutes:raw.durationMinutes||undefined,
      creativeTeam:this.creativeTeamPayload(raw.creativeTeam),cast:this.castPayload(raw.cast),videos:this.rowObjects(raw.videos).filter((item)=>item['url']).map((item,index)=>({...item,thumbnail:item['thumbnail']||null,displayOrder:index})),reviews:this.rowObjects(raw.reviews).filter((item)=>item['url']).map((item,index)=>({...item,publishedAt:this.iso(item['publishedAt']),displayOrder:index})),
      announcement:{...raw.announcement,image:raw.announcement?.image||null,startsAt:this.iso(raw.announcement?.startsAt),endsAt:this.iso(raw.announcement?.endsAt)}};
  }

  private creditGroup(value:Record<string,unknown>,index:number){const en=this.englishOf(value);return this.fb.group({roleKey:[String(value['roleKey']||'other')],label:[String(value['label']||value['role']||''),Validators.required],artist:[this.idOf(value['artist'])],name:[String(value['name']||'')],note:[String(value['note']||'')],translations:this.fb.group({en:this.fb.group({label:[String(en['label']||'')],name:[String(en['name']||'')],note:[String(en['note']||'')]})}),displayOrder:[index]});}
  private castGroup(value:Record<string,unknown>,index:number){const en=this.englishOf(value);return this.fb.group({artist:[this.idOf(value['artist'])],name:[String(value['name']||'')],role:[String(value['role']||value['character']||'')],note:[String(value['note']||'')],translations:this.fb.group({en:this.fb.group({name:[String(en['name']||'')],role:[String(en['role']||'')],note:[String(en['note']||'')]})}),displayOrder:[index]});}
  private videoGroup(value:Record<string,unknown>,index:number){const en=this.englishOf(value);return this.fb.group({provider:[String(value['provider']||'youtube')],url:[String(value['url']||''),[Validators.required,Validators.pattern(/^https?:\/\//i)]],title:[String(value['title']||'')],translations:this.fb.group({en:this.fb.group({title:[String(en['title']||'')]})}),thumbnail:[this.idOf(value['thumbnail'])],isTrailer:[Boolean(value['isTrailer'])],displayOrder:[index]});}
  private reviewGroup(value:Record<string,unknown>,index:number){const en=this.englishOf(value);return this.fb.group({title:[String(value['title']||'')],publication:[String(value['publication']||'')],url:[String(value['url']||''),[Validators.required,Validators.pattern(/^https?:\/\//i)]],publishedAt:[this.dateInput(value['publishedAt'])],note:[String(value['note']||'')],translations:this.fb.group({en:this.fb.group({title:[String(en['title']||'')],publication:[String(en['publication']||'')],note:[String(en['note']||'')]})}),displayOrder:[index]});}
  private replaceArray(array:FormArray,values:Record<string,unknown>[],factory:(value:Record<string,unknown>,index:number)=>FormGroup):void{array.clear();values.forEach((value,index)=>array.push(factory(value,index)));}
  private normalizeCast(values:Record<string,unknown>[]):Record<string,unknown>[] { return values.flatMap((item)=>{if(item['artist']||item['name'])return[item];const artists=this.array(item['artists']);const names=this.array(item['names']);const count=Math.max(artists.length,names.length,1);return Array.from({length:count},(_,index)=>({artist:artists[index],name:String(names[index]||''),role:item['character']||'',note:item['note']||''}));}); }
  private creativeTeamPayload(value:unknown):Record<string,unknown>[] { return this.rowObjects(value).map((item,index)=>{const artist=this.optionalId(item['artist']);const payload:Record<string,unknown>={roleKey:this.trimText(item['roleKey'])||'other',label:this.trimText(item['label']||item['role']),name:this.trimText(item['name']),note:this.trimText(item['note']),translations:item['translations'],displayOrder:index};if(artist)payload['artist']=artist;return payload;}).filter((item)=>Boolean(item['label']&&(item['artist']||item['name']))); }
  private castPayload(value:unknown):Record<string,unknown>[] { return this.rowObjects(value).map((item,index)=>{const artist=this.optionalId(item['artist']);const payload:Record<string,unknown>={name:this.trimText(item['name']),role:this.trimText(item['role']||item['character']),note:this.trimText(item['note']),translations:item['translations'],displayOrder:index};if(artist)payload['artist']=artist;return payload;}).filter((item)=>Boolean(item['artist']||item['name'])); }
  private galleryValue(item:Record<string,unknown>):GalleryItemInput[]{const structured=this.array(item['galleryItems']);if(structured.length)return structured.map((entry,index)=>({media:entry['media'] as unknown as MediaSelectionValue,caption:String(entry['caption']||''),credit:String(entry['credit']||''),altText:String(entry['altText']||''),translations:this.object(entry['translations']) as GalleryItemInput['translations'],displayOrder:Number(entry['displayOrder']??index)}));return this.array(item['gallery']).map((media,index)=>({media:media as unknown as MediaSelectionValue,caption:'',credit:'',altText:'',displayOrder:index}));}
  private englishOf(value:Record<string,unknown>):Record<string,unknown>{return this.object(this.object(value['translations'])['en']);}
  private rowObjects(value:unknown):Record<string,unknown>[]{return Array.isArray(value)?value.map((item)=>this.object(item)):[];}
  private toOptions(value:unknown,key:string,meta?:(item:Record<string,unknown>)=>string):CmsOption[]{return this.array(value).map((item)=>({id:this.idOf(item),label:String(item[key]||''),meta:meta?.(item)||'',status:String(item['status']||'')})).filter((item)=>item.id&&item.label);}
  private optionPairs(value:unknown):Array<{value:string;label:string}>{return this.array(value).map((item)=>({value:String(item['value']||''),label:String(item['label']||item['value']||'')}));}
  private idOf(value:unknown):string{if(!value)return'';if(typeof value==='string')return value;const item=this.object(value);return String(item['_id']||item['id']||'');}
  private optionalId(value:unknown):string{return this.idOf(value).trim();}
  private trimText(value:unknown):string{return String(value||'').trim();}
  private idArray(value:unknown):string[]{return this.array(value).map((item)=>this.idOf(item)).filter(Boolean);}
  private object(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
  private array(value:unknown):Record<string,unknown>[]{return Array.isArray(value)?value.map((item)=>this.object(item)):[];}
  private stringArray(value:unknown):string[]{return Array.isArray(value)?value.map(String):[];}
  private arrayText(value:unknown):string{return Array.isArray(value)?value.join(', '):'';}
  private numberOrNull(value:unknown):number|null{return value===null||value===undefined||value===''?null:Number(value);}
  private dateInput(value:unknown):string{return value?new Date(String(value)).toISOString().slice(0,10):'';}
  private dateTimeInput(value:unknown):string{if(!value)return'';const date=new Date(String(value));const offset=date.getTimezoneOffset()*60000;return new Date(date.getTime()-offset).toISOString().slice(0,16);}
  private iso(value:unknown):string|undefined{return value?new Date(String(value)).toISOString():undefined;}
}
