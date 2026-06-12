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
          { label: 'Program', value: counts['productions'] || 0, route: '/admin/productions' },
          { label: 'Dates', value: counts['events'] || 0, route: '/admin/events' },
          { label: 'Maps', value: counts['seatMaps'] || counts['seatmaps'] || 0, route: '/admin/seat-maps' },
          { label: 'Orders', value: counts['orders'] || 0, route: '/admin/orders' },
          { label: 'People', value: counts['artists'] || 0, route: '/admin/artists' },
          { label: 'Clients', value: counts['customers'] || 0, route: '/admin/customers' },
        ]);

        this.warnings.set(response.warnings || {});
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'System is not available.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }
}
