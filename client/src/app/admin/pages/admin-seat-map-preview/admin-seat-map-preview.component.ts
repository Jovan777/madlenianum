import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  AdminEffectiveSeatState,
  AdminEvent,
  AdminSeat,
  AdminSeatMap,
} from '../../../core/models/admin.models';
import { effectiveSeatStateLabel } from '../../../core/models/cms-labels';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminSeatMapCanvasComponent } from '../../components/admin-seat-map-canvas/admin-seat-map-canvas.component';

@Component({
  selector: 'app-admin-seat-map-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminSeatMapCanvasComponent],
  templateUrl: './admin-seat-map-preview.component.html',
  styleUrl: './admin-seat-map-preview.component.scss',
})
export class AdminSeatMapPreviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminApiService);

  readonly seatMap = signal<AdminSeatMap | null>(null);
  readonly seats = signal<AdminSeat[]>([]);
  readonly events = signal<AdminEvent[]>([]);
  readonly event = signal<AdminEvent | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  eventId = '';

  readonly legend: Array<{ state: AdminEffectiveSeatState; label: string; asset: string }> = [
    { state: 'available', label: 'Slobodno', asset: '/madlenianum/seat-free.png' },
    { state: 'locked', label: 'Zaključano', asset: '/madlenianum/seat-reserved.png' },
    { state: 'reserved', label: 'Rezervisano', asset: '/madlenianum/seat-reserved.png' },
    { state: 'sold', label: 'Prodato', asset: '/madlenianum/seat-bought.png' },
    { state: 'box_office_only', label: 'Samo blagajna', asset: '/madlenianum/seat-reserved.png' },
    { state: 'unavailable', label: 'Nedostupno', asset: '/madlenianum/seat-reserved.png' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) {
      this.errorMessage.set('Nedostaje ID mape.');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.api.getSeatMapPreview(id, this.eventId).subscribe({
      next: (response) => {
        this.seatMap.set(response.item.seatMap);
        this.seats.set(response.item.seats || []);
        this.events.set(response.item.compatibleEvents || this.events());
        this.event.set(response.item.event || null);
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Pregled nije učitan.'),
      complete: () => this.isLoading.set(false),
    });
  }

  eventLabel(item: AdminEvent): string {
    const title = item.production?.title || 'Termin';
    return `${title} · ${new Date(item.startsAt).toLocaleString('sr-RS')}`;
  }

  count(state: AdminEffectiveSeatState): number {
    return this.seats().filter((seat) => seat.availabilityStatus === state).length;
  }

  stateLabel(state: AdminEffectiveSeatState): string {
    return effectiveSeatStateLabel(state);
  }
}
