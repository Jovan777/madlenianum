import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, finalize, takeUntil } from 'rxjs';

import {
  EMAIL_STATUS_OPTIONS,
  INQUIRY_STATUS_OPTIONS,
  emailStatusLabel,
  inquiryStatusLabel,
} from '../../../core/models/phase6a-labels';
import {
  EventPlanningInquiry,
  Phase6AListResponse,
  RentalInquiry,
  RentalSpace,
} from '../../../core/models/phase6a.models';
import { Phase6AAdminService } from '../../../core/services/phase6a-admin.service';

@Component({
  selector: 'app-admin-inquiry-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-inquiry-list.component.html',
  styleUrl: './admin-inquiry-list.component.scss',
})
export class AdminInquiryListComponent implements OnInit, OnDestroy {
  private readonly api = inject(Phase6AAdminService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly tab = signal<'rental' | 'planning'>('rental');
  readonly items = signal<Array<RentalInquiry | EventPlanningInquiry>>([]);
  readonly spaces = signal<RentalSpace[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly total = signal(0);
  readonly statuses = INQUIRY_STATUS_OPTIONS;
  readonly emailStatuses = EMAIL_STATUS_OPTIONS;
  readonly filters = this.fb.nonNullable.group({
    q: [''], status: [''], emailStatus: [''], space: [''], desiredFrom: [''], desiredTo: [''],
  });

  ngOnInit(): void {
    this.api.listRentalSpaces({ limit: 100, status: 'published' }).subscribe({
      next: (response) => this.spaces.set(response.items),
    });
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.tab.set(params.get('type') === 'planning' ? 'planning' : 'rental');
      this.page.set(Number(params.get('page')) || 1);
      this.filters.patchValue({
        q: params.get('q') || '', status: params.get('status') || '', emailStatus: params.get('emailStatus') || '',
        space: params.get('space') || '', desiredFrom: params.get('desiredFrom') || '', desiredTo: params.get('desiredTo') || '',
      }, { emitEvent: false });
      this.load();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  setTab(tab: 'rental' | 'planning'): void { this.router.navigate([], { relativeTo: this.route, queryParams: { type: tab === 'planning' ? 'planning' : null, space: null, page: null }, queryParamsHandling: 'merge' }); }
  apply(): void { const raw = this.filters.getRawValue(); this.router.navigate([], { relativeTo: this.route, queryParams: { q: raw.q || null, status: raw.status || null, emailStatus: raw.emailStatus || null, space: raw.space || null, desiredFrom: raw.desiredFrom || null, desiredTo: raw.desiredTo || null, page: null }, queryParamsHandling: 'merge' }); }
  clearFilters(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: null,
        status: null,
        emailStatus: null,
        space: null,
        desiredFrom: null,
        desiredTo: null,
        page: null,
      },
      queryParamsHandling: 'merge',
    });
  }
  pageBy(delta: number): void { const value = this.page() + delta; if (value >= 1 && value <= this.pages()) this.router.navigate([], { relativeTo: this.route, queryParams: { page: value }, queryParamsHandling: 'merge' }); }
  status(value: string): string { return inquiryStatusLabel(value); }
  emailStatus(value?: string): string { return emailStatusLabel(value); }
  kind(): string { return this.tab() === 'rental' ? 'rental' : 'planning'; }
  spaceLabel(item: RentalInquiry | EventPlanningInquiry): string { return this.isRentalInquiry(item) ? item.rentalSpaceSnapshot?.title || 'Nepoznat prostor' : item.preferredRentalSpaceSnapshot?.title || 'Opšti upit'; }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    const query = { ...this.filters.getRawValue(), page: this.page(), limit: 25, sort: 'newest' };
    const request = (this.tab() === 'rental' ? this.api.listRentalInquiries(query) : this.api.listEventPlanningInquiries(query)) as Observable<Phase6AListResponse<RentalInquiry | EventPlanningInquiry>>;
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => { this.items.set(response.items); this.total.set(response.total); this.pages.set(response.totalPages || 1); },
      error: (error) => this.error.set(error?.error?.message || 'Upiti nisu učitani.'),
    });
  }

  private isRentalInquiry(item: RentalInquiry | EventPlanningInquiry): item is RentalInquiry {
    return 'rentalSpaceSnapshot' in item || 'rentalSpace' in item;
  }
}
