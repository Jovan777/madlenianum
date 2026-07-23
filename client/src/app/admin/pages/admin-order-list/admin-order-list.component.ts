import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  AdminOrder,
  AdminOrderEventOverview,
} from '../../../core/models/admin.models';
import { AdminApiService } from '../../../core/services/admin-api.service';

type OrderTab = 'all' | 'reservations' | 'pending-payment' | 'paid' | 'cancelled' | 'expired';

@Component({
  selector: 'app-admin-order-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-order-list.component.html',
  styleUrl: './admin-order-list.component.scss',
})
export class AdminOrderListComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly overview = signal<AdminOrderEventOverview[]>([]);
  readonly orders = signal<AdminOrder[]>([]);
  readonly mode = signal<'events' | 'orders'>('events');
  readonly activeTab = signal<OrderTab>('all');
  readonly selectedEvent = signal('');
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly total = signal(0);

  readonly searchForm = this.fb.nonNullable.group({
    q: [''],
    time: ['upcoming'],
  });

  readonly tabs: Array<{ value: OrderTab; label: string }> = [
    { value: 'all', label: 'Sve' },
    { value: 'reservations', label: 'Rezervacije' },
    { value: 'pending-payment', label: 'Kupovine u toku' },
    { value: 'paid', label: 'Plaćeno' },
    { value: 'cancelled', label: 'Otkazano' },
    { value: 'expired', label: 'Isteklo' },
  ];

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const view = params.get('view');
        const event = params.get('event') || '';
        const tab = (params.get('tab') || 'all') as OrderTab;
        const page = Number(params.get('page') || 1);
        this.mode.set(view === 'list' || Boolean(event) ? 'orders' : 'events');
        this.selectedEvent.set(event);
        this.activeTab.set(this.tabs.some((item) => item.value === tab) ? tab : 'all');
        this.page.set(Number.isFinite(page) && page > 0 ? page : 1);
        this.searchForm.patchValue({
          q: params.get('q') || '',
          time: params.get('time') || 'upcoming',
        }, { emitEvent: false });
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    if (this.mode() === 'events') {
      const { q, time } = this.searchForm.getRawValue();
      this.api.getOrderEventOverview({ q, time, page: this.page(), limit: 12 })
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (response) => {
            this.overview.set(response.items || []);
            this.applyPagination(response.pagination);
          },
          error: (error) => {
            this.errorMessage.set(error?.error?.message || 'Pregled događaja nije učitan.');
          },
        });
      return;
    }

    const { q, time } = this.searchForm.getRawValue();
    this.api.getOrders({
      q,
      time,
      event: this.selectedEvent(),
      tab: this.activeTab(),
      page: this.page(),
      limit: 25,
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.orders.set(response.items || []);
          this.applyPagination(response.pagination);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Porudžbine nisu učitane.');
        },
      });
  }

  applySearch(): void {
    const { q, time } = this.searchForm.getRawValue();
    this.updateQuery({ q: q.trim() || null, time, page: 1 });
  }

  showEvents(): void {
    this.updateQuery({ view: null, event: null, tab: null, page: 1 });
  }

  showAllOrders(): void {
    this.updateQuery({ view: 'list', event: null, page: 1 });
  }

  openEvent(eventId: string): void {
    this.updateQuery({ view: 'list', event: eventId, tab: 'all', page: 1 });
  }

  selectTab(tab: OrderTab): void {
    this.updateQuery({ view: 'list', tab, page: 1 });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pages()) return;
    this.updateQuery({ page: nextPage });
  }

  statusClass(status: string): string {
    return `status-${status.replaceAll('_', '-')}`;
  }

  private updateQuery(queryParams: Record<string, string | number | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private applyPagination(
    pagination: { page: number; pages: number; total: number } | undefined
  ): void {
    this.page.set(pagination?.page || 1);
    this.pages.set(pagination?.pages || 1);
    this.total.set(pagination?.total || 0);
  }
}
