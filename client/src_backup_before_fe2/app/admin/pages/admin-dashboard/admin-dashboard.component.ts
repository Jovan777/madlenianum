import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';

interface DashboardCard {
  label: string;
  value: number;
  route: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly cards = signal<DashboardCard[]>([]);
  readonly warnings = signal<Record<string, number>>({});

  constructor(private readonly api: AdminApiService) {}

  ngOnInit(): void {
    this.loadStatus();
  }

  loadStatus(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.getSystemStatus().subscribe({
      next: (response) => {
        const counts = response.counts || {};

        this.cards.set([
          { label: 'Productions', value: counts['productions'] || 0, route: '/admin/productions' },
          { label: 'Events', value: counts['events'] || 0, route: '/admin/events' },
          { label: 'Venues', value: counts['venues'] || 0, route: '/admin/venues' },
          { label: 'Seats', value: counts['seats'] || 0, route: '/admin/seats' },
          { label: 'Price Plans', value: counts['pricePlans'] || 0, route: '/admin/price-plans' },
          { label: 'Orders', value: counts['orders'] || 0, route: '/admin/orders' },
          { label: 'Customers', value: counts['customers'] || 0, route: '/admin/customers' },
          { label: 'Active Locks', value: counts['activeLocks'] || 0, route: '/admin/system' },
        ]);

        this.warnings.set(response.warnings || {});
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'System status could not be loaded.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }
}
