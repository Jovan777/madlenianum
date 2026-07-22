import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminEvent, AdminReference } from '../../../core/models/admin.models';
import {
  EVENT_STATUS_OPTIONS,
  SALE_STATUS_OPTIONS,
  TICKETING_PROVIDER_OPTIONS,
  eventStatusLabel,
  saleStatusLabel,
  ticketingProviderLabel,
} from '../../../core/models/cms-labels';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';

@Component({
  selector: 'app-admin-event-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-event-list.component.html',
  styleUrl: './admin-event-list.component.scss',
})
export class AdminEventListComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(AdminNotificationService);

  readonly items = signal<AdminEvent[]>([]);
  readonly venues = signal<AdminReference[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly eventStatuses = EVENT_STATUS_OPTIONS;
  readonly saleStatuses = SALE_STATUS_OPTIONS;
  readonly providers = TICKETING_PROVIDER_OPTIONS;

  q = '';
  from = '';
  to = '';
  venue = '';
  status = '';
  saleStatus = '';
  provider = '';
  timeScope = 'future';
  sort = 'startsAt';
  page = 1;

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    this.q = query.get('q') || '';
    this.from = query.get('from') || '';
    this.to = query.get('to') || '';
    this.venue = query.get('venue') || '';
    this.status = query.get('status') || '';
    this.saleStatus = query.get('saleStatus') || '';
    this.provider = query.get('provider') || '';
    this.timeScope = query.get('timeScope') || 'future';
    this.sort = query.get('sort') || 'startsAt';
    this.page = Number(query.get('page')) || 1;
    this.api.getEventFormOptions().subscribe({
      next: (response) => this.venues.set(response.options.venues || []),
    });
    this.load();
  }

  load(reset = false): void {
    if (reset) this.page = 1;
    this.syncUrl();
    this.loading.set(true);
    this.error.set('');
    this.api.getList<AdminEvent>('events', this.queryString()).subscribe({
      next: (response) => {
        this.items.set(response.items || []);
        this.total.set(response.pagination?.total || 0);
        this.totalPages.set(response.pagination?.pages || 0);
      },
      error: (error) => this.error.set(error?.error?.message || 'Termini nisu učitani.'),
      complete: () => this.loading.set(false),
    });
  }

  duplicate(item: AdminEvent): void {
    if (!window.confirm(`Napraviti bezbedan nacrt termina za „${item.production?.title || 'predstavu'}“?`)) return;
    this.api.duplicate<AdminEvent>('events', item._id).subscribe({
      next: (response) => {
        this.notifications.success('Napravljen je nacrt duplikata. Proverite novi datum pre objave.');
        this.router.navigate(['/admin/events', response.item._id, 'edit']);
      },
      error: (error) => this.notifications.error(error?.error?.message || 'Dupliranje termina nije uspelo.'),
    });
  }

  action(item: AdminEvent, action: 'close-sale' | 'cancel' | 'archive'): void {
    const labels = {
      'close-sale': 'zatvoriti prodaju',
      cancel: 'otkazati termin',
      archive: 'arhivirati termin',
    };
    if (!window.confirm(`Da li želite da ${labels[action]}?`)) return;
    this.api.runAction<AdminEvent>('events', item._id, action).subscribe({
      next: () => {
        this.notifications.success('Status termina je ažuriran.');
        this.load();
      },
      error: (error) => this.notifications.error(error?.error?.message || 'Akcija nije uspela.'),
    });
  }

  pageBy(delta: number): void {
    const next = this.page + delta;
    if (next < 1 || next > this.totalPages()) return;
    this.page = next;
    this.load();
  }

  productionTitle(item: AdminEvent): string {
    return item.production?.title || 'Termin bez naslova';
  }

  statusLabel(value: string): string { return eventStatusLabel(value); }
  saleLabel(value: string): string { return saleStatusLabel(value); }
  providerLabel(value?: string): string { return ticketingProviderLabel(value); }

  private queryString(): string {
    const params = new URLSearchParams({ page: String(this.page), limit: '25', sort: this.sort });
    if (this.q) params.set('q', this.q);
    if (this.from) params.set('from', new Date(`${this.from}T00:00:00`).toISOString());
    if (this.to) params.set('to', new Date(`${this.to}T23:59:59`).toISOString());
    if (this.venue) params.set('venue', this.venue);
    if (this.status) params.set('status', this.status);
    if (this.saleStatus) params.set('saleStatus', this.saleStatus);
    if (this.provider) params.set('ticketingProvider', this.provider);
    if (this.timeScope) params.set('timeScope', this.timeScope);
    return params.toString();
  }

  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.q || null,
        from: this.from || null,
        to: this.to || null,
        venue: this.venue || null,
        status: this.status || null,
        saleStatus: this.saleStatus || null,
        provider: this.provider || null,
        timeScope: this.timeScope !== 'future' ? this.timeScope : null,
        sort: this.sort !== 'startsAt' ? this.sort : null,
        page: this.page > 1 ? this.page : null,
      },
      replaceUrl: true,
    });
  }
}
