import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';

import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-system-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-system-status.component.html',
  styleUrl: './admin-system-status.component.scss',
})
export class AdminSystemStatusComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly counts = signal<Array<{ key: string; value: number }>>([]);
  readonly warnings = signal<Array<{ key: string; value: number }>>([]);

  constructor(private readonly api: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.getSystemStatus().subscribe({
      next: (response) => {
        this.counts.set(this.toEntries(response.counts));
        this.warnings.set(this.toEntries(response.warnings));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'System status could not be loaded.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  private toEntries(value: Record<string, number> = {}) {
    return Object.entries(value).map(([key, itemValue]) => ({
      key,
      value: itemValue,
    }));
  }
}
