import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  AdminEvent,
  AdminEventSeatPreview,
  AdminSeat,
  AdminSeatOverride,
  AdminSeatOverrideType,
} from '../../../core/models/admin.models';
import {
  eventStatusLabel,
  saleStatusLabel,
  seatOverrideLabel,
} from '../../../core/models/cms-labels';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { AdminSeatMapCanvasComponent } from '../../components/admin-seat-map-canvas/admin-seat-map-canvas.component';

@Component({
  selector: 'app-admin-event-seat-overrides',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AdminSeatMapCanvasComponent],
  templateUrl: './admin-event-seat-overrides.component.html',
  styleUrl: './admin-event-seat-overrides.component.scss',
})
export class AdminEventSeatOverridesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminApiService);
  private readonly notifications = inject(AdminNotificationService);

  readonly eventId = signal('');
  readonly preview = signal<AdminEventSeatPreview | null>(null);
  readonly overrides = signal<AdminSeatOverride[]>([]);
  readonly selectedIds = signal<string[]>([]);
  readonly sectionFilter = signal('all');
  readonly highlightType = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  readonly event = computed(() => this.preview()?.event || null);
  readonly seats = computed(() => this.preview()?.seats || []);
  readonly selectedSeats = computed(() => {
    const selected = new Set(this.selectedIds());
    return this.seats().filter((seat) => selected.has(String(seat.id || seat._id)));
  });
  readonly sections = computed(() => [
    ...new Set(this.seats().map((seat) => seat.section).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right, 'sr')));

  readonly form = this.fb.nonNullable.group({
    type: ['blocked' as AdminSeatOverrideType, Validators.required],
    internalReason: ['', [Validators.maxLength(1000)]],
    publicMessage: ['', [Validators.maxLength(300)]],
    replaceExisting: [false],
    confirmActiveSale: [false],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.eventId.set(id);
    if (!id) {
      this.errorMessage.set('Nedostaje ID termina.');
      return;
    }
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    forkJoin({
      preview: this.api.getEventSeatPreview(this.eventId()),
      overrides: this.api.getEventSeatOverrides(this.eventId()),
    }).subscribe({
      next: ({ preview, overrides }) => {
        this.preview.set(preview.item);
        this.overrides.set(overrides.item.overrides || []);
        this.selectedIds.set([]);
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Mapa termina nije učitana.'),
      complete: () => this.isLoading.set(false),
    });
  }

  applyOverride(): void {
    if (this.form.invalid || !this.selectedIds().length || this.isSaving()) return;
    const raw = this.form.getRawValue();
    if (raw.replaceExisting
        && !window.confirm('Postojeći izuzeci na izabranim sedištima biće zamenjeni. Nastaviti?')) {
      return;
    }
    this.isSaving.set(true);
    this.errorMessage.set('');
    this.api.bulkUpsertEventSeatOverrides(this.eventId(), {
      seatIds: this.selectedIds(),
      type: raw.type,
      internalReason: raw.internalReason,
      publicMessage: raw.publicMessage,
      replaceExisting: raw.replaceExisting,
      confirmActiveSale: raw.confirmActiveSale,
    }).subscribe({
      next: (response) => {
        this.notifications.success(`Izuzetak je primenjen na ${response.count} sedišta.`);
        this.load();
      },
      error: (error) => this.handleError(error),
      complete: () => this.isSaving.set(false),
    });
  }

  removeSelected(): void {
    if (!this.selectedIds().length || this.isSaving()
        || !window.confirm('Ukloniti aktivne izuzetke sa izabranih sedišta?')) {
      return;
    }
    this.isSaving.set(true);
    this.api.bulkRemoveEventSeatOverrides(this.eventId(), {
      seatIds: this.selectedIds(),
      confirmActiveSale: this.form.controls.confirmActiveSale.value,
    }).subscribe({
      next: (response) => {
        this.notifications.success(`Uklonjeno izuzetaka: ${response.removedCount}.`);
        this.load();
      },
      error: (error) => this.handleError(error),
      complete: () => this.isSaving.set(false),
    });
  }

  clearType(type: AdminSeatOverrideType): void {
    const count = this.overrideCount(type);
    if (!count || this.isSaving()
        || !window.confirm(`Ukloniti svih ${count} izuzetaka tipa "${seatOverrideLabel(type)}"?`)) {
      return;
    }
    this.isSaving.set(true);
    this.api.clearEventSeatOverrideType(
      this.eventId(),
      type,
      this.form.controls.confirmActiveSale.value
    ).subscribe({
      next: (response) => {
        this.notifications.success(`Uklonjeno izuzetaka: ${response.removedCount}.`);
        this.load();
      },
      error: (error) => this.handleError(error),
      complete: () => this.isSaving.set(false),
    });
  }

  overrideCount(type: AdminSeatOverrideType): number {
    return this.preview()?.summary.overrides.byType[type] || 0;
  }

  typeLabel(type?: string): string {
    return seatOverrideLabel(type);
  }

  statusLabel(item: AdminEvent): string {
    return `${eventStatusLabel(item.status)} · ${saleStatusLabel(item.saleStatus)}`;
  }

  formatDate(value?: string): string {
    return value ? new Date(value).toLocaleString('sr-RS') : '-';
  }

  seatOverride(seat: AdminSeat): AdminSeatOverride | null {
    return seat.override || null;
  }

  selectValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  overrideSeatLabel(item: AdminSeatOverride): string {
    return typeof item.seat === 'object' ? item.seat.label : '-';
  }

  private handleError(error: {
    error?: {
      message?: string;
      details?: { code?: string; fields?: Array<{ message?: string }> };
    };
  }): void {
    const details = error?.error?.details;
    if (details?.code === 'active_sale_confirmation_required') {
      this.form.controls.confirmActiveSale.setValue(false);
    }
    this.errorMessage.set(
      details?.fields?.[0]?.message
      || error?.error?.message
      || 'Izmena izuzetaka nije uspela.'
    );
  }
}
