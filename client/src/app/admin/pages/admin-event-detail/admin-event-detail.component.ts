import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminEvent, AdminEventSummary, AdminUsage } from '../../../core/models/admin.models';
import { eventStatusLabel, saleStatusLabel, ticketingProviderLabel } from '../../../core/models/cms-labels';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';

@Component({
  selector: 'app-admin-event-detail', standalone: true, imports: [CommonModule, RouterLink],
  templateUrl: './admin-event-detail.component.html', styleUrl: './admin-event-detail.component.scss',
})
export class AdminEventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);
  private readonly notifications = inject(AdminNotificationService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly event = signal<AdminEvent | null>(null);
  readonly usage = signal<AdminUsage | null>(null);
  readonly summary = signal<AdminEventSummary | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.errorMessage.set('Nedostaje ID termina.'); return; }
    this.load(id);
  }

  load(id: string): void {
    this.isLoading.set(true); this.errorMessage.set('');
    forkJoin({ event: this.api.getItem<AdminEvent>('events', id), summary: this.api.getEventTicketingSummary(id) }).subscribe({
      next: ({ event, summary }) => {
        this.event.set(event.item); this.usage.set(event.meta?.['usage'] as AdminUsage || null); this.summary.set(summary.item);
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Termin nije učitan.'),
      complete: () => this.isLoading.set(false),
    });
  }

  action(action: 'close-sale' | 'cancel' | 'archive'): void {
    const item = this.event(); if (!item || !window.confirm('Potvrditi promenu statusa termina?')) return;
    this.api.runAction<AdminEvent>('events', item._id, action).subscribe({
      next: () => { this.notifications.success('Status termina je ažuriran.'); this.load(item._id); },
      error: (error) => this.notifications.error(error?.error?.message || 'Akcija nije uspela.'),
    });
  }

  duplicate(): void {
    const item = this.event(); if (!item || !window.confirm('Napraviti nacrt duplikata termina?')) return;
    this.api.duplicate<AdminEvent>('events', item._id).subscribe({
      next: (response) => { this.notifications.success('Duplikat je napravljen kao nacrt.'); this.router.navigate(['/admin/events',response.item._id,'edit']); },
      error: (error) => this.notifications.error(error?.error?.message || 'Dupliranje nije uspelo.'),
    });
  }

  deleteEvent(): void {
    const item = this.event(); if (!item || this.usage()?.hasHistory || !window.confirm('Trajno obrisati nekorišćen termin?')) return;
    this.api.delete('events', item._id).subscribe({
      next: () => { this.notifications.success('Termin je obrisan.'); this.router.navigate(['/admin/events']); },
      error: (error) => this.notifications.error(error?.error?.message || 'Brisanje nije uspelo.'),
    });
  }

  formatDate(value?: string | null): string { return value ? new Date(value).toLocaleString('sr-RS') : '-'; }
  eventLabel(value: string): string { return eventStatusLabel(value); }
  saleLabel(value: string): string { return saleStatusLabel(value); }
  providerLabel(value?: string): string { return ticketingProviderLabel(value); }
}
