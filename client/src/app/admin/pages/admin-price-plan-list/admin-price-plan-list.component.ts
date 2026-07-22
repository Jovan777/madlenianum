import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminPricePlan, AdminReference } from '../../../core/models/admin.models';
import {
  PRICE_PLAN_STATUS_OPTIONS,
  PRODUCTION_TYPE_OPTIONS,
  pricePlanStatusLabel,
  productionTypeLabel,
} from '../../../core/models/cms-labels';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';

@Component({
  selector: 'app-admin-price-plan-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-price-plan-list.component.html',
  styleUrl: './admin-price-plan-list.component.scss',
})
export class AdminPricePlanListComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(AdminNotificationService);

  readonly items = signal<AdminPricePlan[]>([]);
  readonly venues = signal<AdminReference[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly statuses = PRICE_PLAN_STATUS_OPTIONS;
  readonly productionTypes = PRODUCTION_TYPE_OPTIONS;

  q = '';
  venue = '';
  status = '';
  premiere = '';
  productionType = '';
  validOn = '';
  page = 1;

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    this.q = query.get('q') || '';
    this.venue = query.get('venue') || '';
    this.status = query.get('status') || '';
    this.premiere = query.get('isPremiere') || '';
    this.productionType = query.get('productionType') || '';
    this.validOn = query.get('validOn') || '';
    this.page = Number(query.get('page')) || 1;
    this.api.getPricePlanFormOptions().subscribe({ next: (response) => this.venues.set(response.options.venues || []) });
    this.load();
  }

  load(reset = false): void {
    if (reset) this.page = 1;
    this.syncUrl();
    this.loading.set(true);
    this.error.set('');
    this.api.getList<AdminPricePlan>('price-plans', this.queryString()).subscribe({
      next: (response) => {
        this.items.set(response.items || []);
        this.total.set(response.pagination?.total || 0);
        this.totalPages.set(response.pagination?.pages || 0);
      },
      error: (error) => this.error.set(error?.error?.message || 'Cenovnici nisu učitani.'),
      complete: () => this.loading.set(false),
    });
  }

  duplicate(item: AdminPricePlan): void {
    if (!window.confirm(`Napraviti novu verziju cenovnika „${item.name}“?`)) return;
    this.api.duplicate<AdminPricePlan>('price-plans', item._id).subscribe({
      next: (response) => {
        this.notifications.success('Nova verzija je napravljena kao nacrt. Postojeći termini nisu promenjeni.');
        this.router.navigate(['/admin/price-plans', response.item._id, 'edit']);
      },
      error: (error) => this.notifications.error(error?.error?.message || 'Nova verzija nije napravljena.'),
    });
  }

  action(item: AdminPricePlan, action: 'activate' | 'deactivate' | 'archive'): void {
    if (!window.confirm('Promeniti status cenovnika?')) return;
    this.api.runAction<AdminPricePlan>('price-plans', item._id, action).subscribe({
      next: () => { this.notifications.success('Status cenovnika je ažuriran.'); this.load(); },
      error: (error) => this.notifications.error(error?.error?.message || 'Promena statusa nije uspela.'),
    });
  }

  remove(item: AdminPricePlan): void {
    if (item.usage?.hasUsage || !window.confirm(`Trajno obrisati nekorišćen cenovnik „${item.name}“?`)) return;
    this.api.delete('price-plans', item._id).subscribe({
      next: () => { this.notifications.success('Nekorišćen cenovnik je obrisan.'); this.load(); },
      error: (error) => this.notifications.error(error?.error?.message || 'Brisanje cenovnika nije uspelo.'),
    });
  }

  pageBy(delta: number): void {
    const next = this.page + delta;
    if (next < 1 || next > this.totalPages()) return;
    this.page = next;
    this.load();
  }

  statusLabel(value: string): string { return pricePlanStatusLabel(value); }
  typeLabels(item: AdminPricePlan): string { return item.productionTypes.map(productionTypeLabel).join(', '); }
  usageLabel(item: AdminPricePlan): string {
    const usage = item.usage;
    if (!usage?.hasUsage) return 'Nije korišćen';
    return `${usage.events || 0} termina · ${usage.orders || 0} porudžbina`;
  }

  private queryString(): string {
    const params = new URLSearchParams({ page: String(this.page), limit: '25' });
    if (this.q) params.set('q', this.q);
    if (this.venue) params.set('venue', this.venue);
    if (this.status) params.set('status', this.status);
    if (this.premiere) params.set('isPremiere', this.premiere);
    if (this.productionType) params.set('productionType', this.productionType);
    if (this.validOn) params.set('validOn', this.validOn);
    return params.toString();
  }

  private syncUrl(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {
      q: this.q || null,
      venue: this.venue || null,
      status: this.status || null,
      isPremiere: this.premiere || null,
      productionType: this.productionType || null,
      validOn: this.validOn || null,
      page: this.page > 1 ? this.page : null,
    }, replaceUrl: true });
  }
}
