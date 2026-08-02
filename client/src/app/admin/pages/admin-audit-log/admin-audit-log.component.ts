import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminAuditLog } from '../../../core/models/admin.models';
import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-audit-log.component.html',
  styleUrl: './admin-audit-log.component.scss',
})
export class AdminAuditLogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly items = signal<AdminAuditLog[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly total = signal(0);
  readonly filters = this.fb.nonNullable.group({ action: [''], entityType: [''] });

  constructor(
    private readonly api: AdminApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.filters.patchValue({
        action: params.get('action') || '',
        entityType: params.get('entityType') || '',
      }, { emitEvent: false });
      this.page.set(Math.max(1, Number(params.get('page')) || 1));
      this.load();
    });
  }

  apply(): void {
    const { action, entityType } = this.filters.getRawValue();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { action: action || null, entityType: entityType || null, page: null },
    });
  }

  reset(): void {
    this.filters.reset();
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  changePage(value: number): void {
    if (value < 1 || value > this.pages()) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: value }, queryParamsHandling: 'merge' });
  }

  actionLabel(value: string): string {
    return ({ create: 'Kreirano', update: 'Izmenjeno', delete: 'Obrisano', publish: 'Objavljeno', archive: 'Arhivirano', duplicate: 'Duplirano', close_sale: 'Prodaja zatvorena', cancel: 'Otkazano', mark_paid: 'Označeno kao plaćeno', resend_email: 'Email ponovo poslat', login_success: 'Uspešna prijava', login_failed: 'Neuspešna prijava', login_blocked: 'Blokirana prijava' } as Record<string, string>)[value] || value;
  }

  summaryEntries(item: AdminAuditLog): Array<[string, string | number | boolean]> {
    return Object.entries(item.summary || {});
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const values = this.filters.getRawValue();
    const params = new URLSearchParams({ page: String(this.page()), limit: '30' });
    if (values.action) params.set('action', values.action);
    if (values.entityType) params.set('entityType', values.entityType);
    this.api.getList<AdminAuditLog>('audit-logs', params.toString()).subscribe({
      next: (response) => {
        this.items.set(response.items);
        this.page.set(response.pagination?.page || 1);
        this.pages.set(response.pagination?.pages || 1);
        this.total.set(response.pagination?.total || 0);
      },
      error: (error) => this.error.set(error?.error?.message || 'Audit aktivnosti nisu učitane.'),
      complete: () => this.loading.set(false),
    });
  }
}
