import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';
import { ADMIN_RESOURCE_CONFIGS, ResourceColumn } from '../../config/admin-resource.config';

@Component({
  selector: 'app-admin-resource-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-resource-list.component.html',
  styleUrl: './admin-resource-list.component.scss',
})
export class AdminResourceListComponent implements OnInit {
  readonly pageKey = signal('productions');
  readonly items = signal<Record<string, unknown>[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly total = signal(0);

  readonly config = computed(() => {
    return ADMIN_RESOURCE_CONFIGS[this.pageKey()] || ADMIN_RESOURCE_CONFIGS['productions'];
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: AdminApiService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.pageKey.set(params.get('resource') || 'productions');
      this.loadData();
    });
  }

  loadData(): void {
    const config = this.config();

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.api.getList<Record<string, unknown>>(config.resource, config.query || '').subscribe({
      next: (response) => {
        this.items.set(response.items || []);
        this.total.set(response.pagination?.total ?? response.items?.length ?? 0);
      },
      error: (error) => {
        this.items.set([]);
        this.total.set(0);
        this.errorMessage.set(error?.error?.message || 'Cannot load.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  deleteItem(item: Record<string, unknown>): void {
    const id = this.getItemId(item);

    if (!id || !this.config().canDelete) {
      return;
    }

    const confirmed = window.confirm('Delete item?');

    if (!confirmed) {
      return;
    }

    this.api.delete(this.config().resource, id).subscribe({
      next: () => {
        this.successMessage.set('Deleted.');
        this.loadData();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Delete failed.');
      },
    });
  }

  getValue(item: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }

      return (value as Record<string, unknown>)[key];
    }, item);
  }

  formatValue(value: unknown, column?: ResourceColumn): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (column?.type === 'date' && typeof value === 'string') {
      return new Date(value).toLocaleDateString('sr-RS', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (column?.type === 'money' && typeof value === 'number') {
      return `${value.toLocaleString('sr-RS')} RSD`;
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      return String(
        objectValue['title'] ||
          objectValue['name'] ||
          objectValue['displayName'] ||
          objectValue['email'] ||
          objectValue['_id'] ||
          '-'
      );
    }

    return String(value);
  }

  getItemId(item: Record<string, unknown>): string {
    return String(item['_id'] || item['id'] || '');
  }

  primaryValue(item: Record<string, unknown>): string {
    const columns = this.config().columns;
    return this.formatValue(this.getValue(item, columns[0]?.key || 'title'), columns[0]);
  }

  metaColumns(): ResourceColumn[] {
    return this.config().columns.slice(1, 4);
  }

  detailLink(item: Record<string, unknown>): string[] | null {
    const route = this.config().detailRoute;
    const id = this.getItemId(item);

    if (!route || !id) {
      return null;
    }

    return [route, id];
  }

  editLink(item: Record<string, unknown>): string[] | null {
    const id = this.getItemId(item);

    if (!this.config().canEdit || !id) {
      return null;
    }

    if (this.pageKey() === 'events') {
      return ['/admin/events', id, 'edit'];
    }

    return ['/admin', this.pageKey(), id, 'edit'];
  }

  mapLink(item: Record<string, unknown>): string[] | null {
    const id = this.getItemId(item);

    if (!this.config().mapRoute || !id) {
      return null;
    }

    return [this.config().mapRoute!, id, 'map'];
  }

  newLink(): string[] | null {
    if (!this.config().canCreate) {
      return null;
    }

    if (this.pageKey() === 'events') {
      return ['/admin/events/new'];
    }

    return ['/admin', this.pageKey(), 'new'];
  }
}
