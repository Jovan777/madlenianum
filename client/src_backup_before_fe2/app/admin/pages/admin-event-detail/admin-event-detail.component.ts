import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-event-detail.component.html',
  styleUrl: './admin-event-detail.component.scss',
})
export class AdminEventDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly event = signal<any | null>(null);
  readonly meta = signal<Record<string, unknown> | null>(null);
  readonly summary = signal<any | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: AdminApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Event id is missing.');
      return;
    }

    this.load(id);
  }

  load(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      event: this.api.getItem<any>('events', id),
      summary: this.api.getEventTicketingSummary(id),
    }).subscribe({
      next: ({ event, summary }) => {
        this.event.set(event.item);
        this.meta.set(event.meta || null);
        this.summary.set((summary.item as any) || null);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Event could not be loaded.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  formatDate(value: string | Date | undefined): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('sr-RS');
  }
}
