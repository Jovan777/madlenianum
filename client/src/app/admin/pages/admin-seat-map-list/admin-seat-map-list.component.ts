import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminSeatMap } from '../../../core/models/admin.models';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';

@Component({
  selector: 'app-admin-seat-map-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-seat-map-list.component.html',
  styleUrl: './admin-seat-map-list.component.scss',
})
export class AdminSeatMapListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);
  private readonly notifications = inject(AdminNotificationService);

  readonly items = signal<AdminSeatMap[]>([]);
  readonly venues = signal<Array<{ _id: string; name: string }>>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(1);

  q = '';
  venue = '';
  status = '';

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') || '';
      this.venue = params.get('venue') || '';
      this.status = params.get('status') || '';
      this.page.set(Math.max(Number(params.get('page')) || 1, 1));
      this.load();
    });
    this.api.getList<{ _id: string; name: string }>('venues', 'limit=100').subscribe({
      next: (response) => this.venues.set(response.items || []),
    });
  }

  applyFilters(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.q || null,
        venue: this.venue || null,
        status: this.status || null,
        page: 1,
      },
    });
  }

  resetFilters(): void {
    this.q = '';
    this.venue = '';
    this.status = '';
    this.applyFilters();
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pages()) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: nextPage },
      queryParamsHandling: 'merge',
    });
  }

  duplicate(item: AdminSeatMap): void {
    if (!window.confirm(`Napraviti nezavisnu kopiju mape "${item.name}"?`)) return;
    this.api.duplicate<AdminSeatMap>('seat-maps', item._id).subscribe({
      next: (response) => {
        this.notifications.success('Duplikat mape je napravljen kao nacrt.');
        this.router.navigate(['/admin/seat-maps', response.item._id, 'map']);
      },
      error: (error) => this.notifications.error(error?.error?.message || 'Dupliranje nije uspelo.'),
    });
  }

  archive(item: AdminSeatMap): void {
    if (!window.confirm(`Arhivirati mapu "${item.name}"?`)) return;
    this.api.runAction<AdminSeatMap>('seat-maps', item._id, 'archive').subscribe({
      next: () => {
        this.notifications.success('Mapa je arhivirana.');
        this.load();
      },
      error: (error) => this.notifications.error(error?.error?.message || 'Arhiviranje nije uspelo.'),
    });
  }

  remove(item: AdminSeatMap): void {
    if (item.usage?.hasUsage || !window.confirm(`Trajno obrisati praznu mapu "${item.name}"?`)) return;
    this.api.delete('seat-maps', item._id).subscribe({
      next: () => {
        this.notifications.success('Mapa je obrisana.');
        this.load();
      },
      error: (error) => this.notifications.error(error?.error?.message || 'Brisanje nije uspelo.'),
    });
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    const params = new URLSearchParams({
      page: String(this.page()),
      limit: '20',
    });
    if (this.q) params.set('q', this.q);
    if (this.venue) params.set('venue', this.venue);
    if (this.status) params.set('status', this.status);
    this.api.getList<AdminSeatMap>('seat-maps', params.toString()).subscribe({
      next: (response) => {
        this.items.set(response.items || []);
        this.total.set(response.pagination?.total ?? response.items.length);
        this.pages.set(response.pagination?.pages || 1);
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Mape nisu učitane.'),
      complete: () => this.isLoading.set(false),
    });
  }
}
