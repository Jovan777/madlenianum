import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminSystemStatusResponse } from '../../../core/models/admin.models';
import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-system-status',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-system-status.component.html',
  styleUrl: './admin-system-status.component.scss',
})
export class AdminSystemStatusComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly counts = signal<Array<{ key: string; value: number }>>([]);
  readonly warnings = signal<Array<{ key: string; value: number }>>([]);
  readonly warningItems = signal<NonNullable<AdminSystemStatusResponse['warningItems']>>([]);

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
        this.warningItems.set(response.warningItems || []);
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

  label(key: string): string {
    return ({
      productions: 'Predstave', artists: 'Umetnici', events: 'Termini', venues: 'Scene', seatMaps: 'Mape sedišta', seats: 'Sedišta',
      priceCategories: 'Cenovne kategorije', pricePlans: 'Cenovnici', customers: 'Legacy kupci', orders: 'Porudžbine', orderItems: 'Stavke', activeLocks: 'Aktivne rezervacije',
      eventsOnSale: 'Termini u prodaji', eventsMissingSeatMap: 'Prodaja bez mape', eventsMissingPricePlan: 'Prodaja bez cenovnika',
      venue_mismatch: 'Pogrešna scena', not_yet_valid: 'Cenovnik još ne važi', expired: 'Cenovnik je istekao', unsupported_production_type: 'Nepodržan tip predstave',
      premiere_mismatch: 'Premijerni status se ne podudara', invalid_range: 'Neispravan period', scheduled_in_past: 'Prošao termin je zakazan', sale_open_after_start: 'Prodaja otvorena posle početka',
      inactive_category: 'Neaktivna kategorija', overlapping_active_plan: 'Preklapanje cenovnika', missing_sale_start: 'Nedostaje početak prodaje', missing_sale_end: 'Nedostaje kraj prodaje',
      expired_locks_not_cleaned: 'Istekla zaključavanja nisu očišćena', email_transport_not_configured: 'Email nije konfigurisan', cors_allowlist_not_configured: 'CORS allowlista nije konfigurisana',
      order_confirmation_email_failed: 'Potvrda porudžbine nije poslata', active_order_past_expiry: 'Aktivna porudžbina je istekla', missing_order_snapshot: 'Nedostaje istorijski snapshot', duplicate_active_order_seat: 'Duplirana aktivna rezervacija sedišta', rental_inquiry_email_failed: 'Email za zakup nije poslat', event_planning_inquiry_email_failed: 'Email za događaj nije poslat', no_publicly_available_seats: 'Nema javno dostupnih sedišta', invalid_override_reference: 'Neispravna referenca izuzetka', override_seat_map_mismatch: 'Izuzetak van mape',
    } as Record<string, string>)[key] || key;
  }
}
