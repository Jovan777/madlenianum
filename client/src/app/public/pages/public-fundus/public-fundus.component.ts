import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, finalize, takeUntil } from 'rxjs';

import { COSTUME_GENDER_OPTIONS, costumeGenderLabel } from '../../../core/models/phase6a-labels';
import { CostumeItem, Phase6AListResponse, PropScenographyItem } from '../../../core/models/phase6a.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';

type FundusTab = 'costumes' | 'props';

@Component({
  selector: 'app-public-fundus',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './public-fundus.component.html',
  styleUrl: './public-fundus.component.scss',
})
export class PublicFundusComponent implements OnInit, OnDestroy {
  private readonly api = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);

  readonly activeTab = signal<FundusTab>('costumes');
  readonly costumes = signal<CostumeItem[]>([]);
  readonly props = signal<PropScenographyItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly genders = COSTUME_GENDER_OPTIONS;
  readonly costumeEpochs = [
    { value: 'Austrougarska', label: 'Austrougarska' },
    { value: '19. vek', label: '19. vek' },
    { value: '20. vek', label: '20. vek' },
    { value: 'klasicni stil', label: 'Klasični stil' },
    { value: 'savremeno', label: 'Savremeno' },
  ];
  readonly propEpochs = [
    { value: 'klasicni stil', label: 'Klasični stil' },
    { value: 'istorijski stil', label: 'Istorijski stil' },
    { value: 'savremeno', label: 'Savremeno' },
    { value: 'razno', label: 'Razno' },
  ];
  readonly filters = this.fb.nonNullable.group({ q: [''], gender: [''], epoch: [''], size: [''], itemType: [''], category: [''], epochOrStyle: [''] });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.activeTab.set(params.get('tab') === 'props' ? 'props' : 'costumes');
      this.page.set(Math.max(1, Number(params.get('page')) || 1));
      this.filters.patchValue({
        q: params.get('q') || '', gender: params.get('gender') || '', epoch: params.get('epoch') || '', size: params.get('size') || '',
        itemType: params.get('itemType') || '', category: params.get('category') || '', epochOrStyle: params.get('epochOrStyle') || '',
      }, { emitEvent: false });
      this.load();
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  setTab(tab: FundusTab): void { this.router.navigate([], { relativeTo: this.route, queryParams: { tab: tab === 'props' ? 'props' : null, page: null }, queryParamsHandling: 'merge' }); }
  apply(): void { this.updateQuery(1); }
  reset(): void { this.filters.reset(); this.updateQuery(1); }
  changePage(page: number): void { if (page < 1 || page > this.totalPages()) return; this.updateQuery(page); }
  heroImage(): string { return '/madlenianum/fundus_wallpaper.png'; }
  image(item: CostumeItem | PropScenographyItem): string { return this.api.mediaUrl(item.mainImage) || '/madlenianum/logo.png'; }
  visibleItems(): Array<CostumeItem | PropScenographyItem> { return this.activeTab() === 'costumes' ? this.costumes() : this.props(); }
  detailRoute(item: CostumeItem | PropScenographyItem): string[] {
    const base = this.activeTab() === 'costumes'
      ? this.locale.equivalentPath('/fundusi/kostimi', this.locale.current())
      : this.locale.equivalentPath('/fundusi/rekviziti-scenografija', this.locale.current());
    return [base, item.slug];
  }
  trackById(_index: number, item: CostumeItem | PropScenographyItem): string { return item.id; }
  pageNumbers(): number[] { return Array.from({ length: this.totalPages() }, (_, index) => index + 1); }
  genderLabel(value: string): string {
    return value ? costumeGenderLabel(value, this.locale.current()) : this.i18n.t('fundus.gender');
  }
  epochLabel(value: string): string {
    if (!this.locale.isEnglish()) return value;
    const labels: Record<string, string> = {
      Austrougarska: 'Austro-Hungarian',
      '19. vek': '19th century',
      '20. vek': '20th century',
      'klasicni stil': 'Classical style',
      'istorijski stil': 'Historical style',
      savremeno: 'Contemporary',
      razno: 'Various',
    };
    return labels[value] || value;
  }
  hasActiveFilters(): boolean {
    const raw = this.filters.getRawValue();
    return this.activeTab() === 'costumes'
      ? Boolean(raw.q.trim() || raw.gender || raw.epoch || raw.size)
      : Boolean(raw.q.trim() || raw.itemType || raw.category.trim() || raw.epochOrStyle);
  }

  private load(): void {
    this.loading.set(true); this.error.set('');
    const raw = this.filters.getRawValue();
    const request = (this.activeTab() === 'costumes'
      ? this.api.getCostumes({ q: raw.q, gender: raw.gender, epoch: raw.epoch, size: raw.size, page: this.page(), limit: 15 })
      : this.api.getPropsScenography({ q: raw.q, itemType: raw.itemType, category: raw.category, epochOrStyle: raw.epochOrStyle, page: this.page(), limit: 15 })) as Observable<Phase6AListResponse<CostumeItem | PropScenographyItem>>;
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => {
        if (this.activeTab() === 'costumes') {
          this.costumes.set(response.items as CostumeItem[]);
          this.props.set([]);
        } else {
          this.props.set(response.items as PropScenographyItem[]);
          this.costumes.set([]);
        }
        this.total.set(response.total); this.totalPages.set(response.totalPages || response.pagination?.totalPages || 1);
      },
      error: (error) => this.error.set(error?.error?.message || this.i18n.t('fundus.error')),
    });
  }

  private updateQuery(page: number): void {
    const raw = this.filters.getRawValue();
    this.router.navigate([], { relativeTo: this.route, queryParams: {
      tab: this.activeTab() === 'props' ? 'props' : null, q: raw.q.trim() || null,
      gender: this.activeTab() === 'costumes' ? raw.gender || null : null,
      epoch: this.activeTab() === 'costumes' ? raw.epoch.trim() || null : null,
      size: this.activeTab() === 'costumes' ? raw.size.trim() || null : null,
      itemType: this.activeTab() === 'props' ? raw.itemType || null : null,
      category: this.activeTab() === 'props' ? raw.category.trim() || null : null,
      epochOrStyle: this.activeTab() === 'props' ? raw.epochOrStyle.trim() || null : null,
      page: page > 1 ? page : null,
    }});
  }
}
