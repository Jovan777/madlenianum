import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-event-form.component.html',
  styleUrl: './admin-event-form.component.scss',
})
export class AdminEventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly options = signal<Record<string, any[]>>({});
  readonly eventId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    production: ['', Validators.required],
    venue: ['', Validators.required],
    startsAt: ['', Validators.required],
    endsAt: [''],
    isPremiere: [false],
    badge: [''],
    status: ['scheduled', Validators.required],
    saleStatus: ['not_on_sale', Validators.required],
    seatMap: [''],
    pricePlan: [''],
    saleStartsAt: [''],
    saleEndsAt: [''],
    maxTicketsPerOrder: [4, [Validators.required, Validators.min(1), Validators.max(20)]],
    lockDurationMinutes: [15, [Validators.required, Validators.min(1), Validators.max(60)]],
    notes: [''],
    ticketing: this.fb.nonNullable.group({
      enabled: [false],
      provider: ['manual', Validators.required],
      legacyEventId: [''],
      externalCheckoutUrl: [''],
      note: [''],
    }),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.eventId.set(id);
    this.loadOptions();

    if (id) {
      this.loadEvent(id);
    }
  }

  get isEditMode(): boolean {
    return Boolean(this.eventId());
  }

  get productions(): any[] {
    return this.options()['productions'] || [];
  }

  get venues(): any[] {
    return this.options()['venues'] || [];
  }

  get seatMaps(): any[] {
    const venueId = this.form.controls.venue.value;
    const items = this.options()['seatMaps'] || [];
    return venueId ? items.filter((item) => this.getId(item.venue) === venueId) : items;
  }

  get pricePlans(): any[] {
    const venueId = this.form.controls.venue.value;
    const items = this.options()['pricePlans'] || [];
    return venueId ? items.filter((item) => this.getId(item.venue) === venueId) : items;
  }

  selectedSeatMap(): any | null {
    const id = this.form.controls.seatMap.value;
    return this.seatMaps.find((item) => this.getId(item) === id) || null;
  }

  selectedPricePlan(): any | null {
    const id = this.form.controls.pricePlan.value;
    return this.pricePlans.find((item) => this.getId(item) === id) || null;
  }

  pricePlanRules(): any[] {
    return this.selectedPricePlan()?.rules || [];
  }

  formatRule(rule: any): string {
    const category = rule.priceCategory;
    const categoryLabel = category?.code ? `${category.code} / ${category.name}` : 'Category';
    return `${categoryLabel}: ${Number(rule.amount || 0).toLocaleString('sr-RS')} ${this.selectedPricePlan()?.currency || 'RSD'}`;
  }

  get eventStatuses(): any[] {
    return this.options()['eventStatuses'] || [];
  }

  get saleStatuses(): any[] {
    return this.options()['saleStatuses'] || [];
  }

  get ticketingProviders(): any[] {
    return this.options()['ticketingProviders'] || [];
  }

  loadOptions(): void {
    this.api.getEventFormOptions().subscribe({
      next: (response) => {
        this.options.set(response.options || {});
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Event options could not be loaded.');
      },
    });
  }

  loadEvent(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.getItem<any>('events', id).subscribe({
      next: (response) => {
        this.patchForm(response.item);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Event could not be loaded.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  patchForm(item: any): void {
    this.form.patchValue({
      production: this.getId(item.production),
      venue: this.getId(item.venue),
      startsAt: this.toDateTimeLocal(item.startsAt),
      endsAt: this.toDateTimeLocal(item.endsAt),
      isPremiere: Boolean(item.isPremiere),
      badge: item.badge || '',
      status: item.status || 'scheduled',
      saleStatus: item.saleStatus || 'not_on_sale',
      seatMap: this.getId(item.seatMap),
      pricePlan: this.getId(item.pricePlan),
      saleStartsAt: this.toDateTimeLocal(item.saleStartsAt),
      saleEndsAt: this.toDateTimeLocal(item.saleEndsAt),
      maxTicketsPerOrder: Number(item.maxTicketsPerOrder || 4),
      lockDurationMinutes: Number(item.lockDurationMinutes || 15),
      notes: item.notes || '',
      ticketing: {
        enabled: Boolean(item.ticketing?.enabled),
        provider: item.ticketing?.provider || 'manual',
        legacyEventId: item.ticketing?.legacyEventId || '',
        externalCheckoutUrl: item.ticketing?.externalCheckoutUrl || '',
        note: item.ticketing?.note || '',
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload = this.buildPayload();
    const id = this.eventId();
    const request = id ? this.api.update<any>('events', id, payload) : this.api.create<any>('events', payload);

    request.subscribe({
      next: (response) => {
        const savedId = this.getId(response.item);
        this.successMessage.set('Event saved.');

        if (!id && savedId) {
          this.router.navigate(['/admin/events', savedId, 'edit']);
        }
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Event save failed.');
      },
      complete: () => {
        this.isSaving.set(false);
      },
    });
  }

  buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();

    return {
      production: raw.production,
      venue: raw.venue,
      startsAt: raw.startsAt ? new Date(raw.startsAt).toISOString() : undefined,
      endsAt: raw.endsAt ? new Date(raw.endsAt).toISOString() : undefined,
      isPremiere: raw.isPremiere,
      badge: raw.badge,
      status: raw.status,
      saleStatus: raw.saleStatus,
      seatMap: raw.seatMap || undefined,
      pricePlan: raw.pricePlan || undefined,
      saleStartsAt: raw.saleStartsAt ? new Date(raw.saleStartsAt).toISOString() : undefined,
      saleEndsAt: raw.saleEndsAt ? new Date(raw.saleEndsAt).toISOString() : undefined,
      maxTicketsPerOrder: Number(raw.maxTicketsPerOrder),
      lockDurationMinutes: Number(raw.lockDurationMinutes),
      notes: raw.notes,
      ticketing: {
        enabled: raw.ticketing.enabled,
        provider: raw.ticketing.provider,
        legacyEventId: raw.ticketing.legacyEventId,
        externalCheckoutUrl: raw.ticketing.externalCheckoutUrl,
        note: raw.ticketing.note,
      },
    };
  }

  getId(value: any): string {
    return String(value?._id || value?.id || value || '');
  }

  toDateTimeLocal(value: unknown): string {
    if (!value) {
      return '';
    }

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
