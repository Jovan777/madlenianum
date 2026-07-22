import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';
import { UnsavedChangesAware } from '../../../core/guards/unsaved-changes.guard';

@Component({
  selector: 'app-admin-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-event-form.component.html',
  styleUrl: './admin-event-form.component.scss',
})
export class AdminEventFormComponent implements OnInit, UnsavedChangesAware {
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
    this.form.controls.venue.valueChanges.subscribe(() => this.clearMismatchedTicketingOptions());

    if (id) {
      this.loadEvent(id);
    }
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.isSaving();
  }

  @HostListener('window:beforeunload', ['$event'])
  preventAccidentalClose(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
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
        this.clearMismatchedTicketingOptions();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Opcije za termin nisu dostupne.');
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
        this.errorMessage.set(error?.error?.message || 'Termin nije moguće učitati.');
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
    this.form.markAsPristine();
  }

  submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const functionalError = this.functionalValidationError();
    if (functionalError) {
      this.errorMessage.set(functionalError);
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
        this.form.markAsPristine();
        this.successMessage.set('Termin je sačuvan.');

        if (!id && savedId) {
          this.router.navigate(['/admin/events', savedId, 'edit']);
        }
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Čuvanje termina nije uspelo.');
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
      endsAt: raw.endsAt ? new Date(raw.endsAt).toISOString() : null,
      isPremiere: raw.isPremiere,
      badge: raw.badge,
      status: raw.status,
      saleStatus: raw.saleStatus,
      seatMap: raw.seatMap || null,
      pricePlan: raw.pricePlan || null,
      saleStartsAt: raw.saleStartsAt ? new Date(raw.saleStartsAt).toISOString() : null,
      saleEndsAt: raw.saleEndsAt ? new Date(raw.saleEndsAt).toISOString() : null,
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

  private functionalValidationError(): string {
    const raw = this.form.getRawValue();
    const startsAt = raw.startsAt ? new Date(raw.startsAt).getTime() : 0;
    const endsAt = raw.endsAt ? new Date(raw.endsAt).getTime() : 0;
    const saleStartsAt = raw.saleStartsAt ? new Date(raw.saleStartsAt).getTime() : 0;
    const saleEndsAt = raw.saleEndsAt ? new Date(raw.saleEndsAt).getTime() : 0;

    if (endsAt && endsAt <= startsAt) return 'Kraj događaja mora biti posle početka.';
    if (saleStartsAt && saleEndsAt && saleEndsAt <= saleStartsAt) return 'Kraj prodaje mora biti posle početka prodaje.';
    if (saleEndsAt && saleEndsAt >= startsAt) return 'Prodaja mora da se završi pre početka događaja.';

    if (raw.ticketing.enabled && raw.ticketing.provider === 'internal') {
      if (!raw.seatMap || !raw.pricePlan) {
        return 'Interna prodaja zahteva mapu sedišta i cenovnik.';
      }
    }

    if (raw.ticketing.enabled && ['external', 'legacy_php'].includes(raw.ticketing.provider) && !raw.ticketing.externalCheckoutUrl) {
      return 'Spoljna prodaja zahteva URL za kupovinu.';
    }

    return '';
  }

  private clearMismatchedTicketingOptions(): void {
    const selectedSeatMap = this.form.controls.seatMap.value;
    const selectedPricePlan = this.form.controls.pricePlan.value;
    const allSeatMaps = this.options()['seatMaps'] || [];
    const allPricePlans = this.options()['pricePlans'] || [];

    if (selectedSeatMap && allSeatMaps.length && !this.seatMaps.some((item) => this.getId(item) === selectedSeatMap)) {
      this.form.controls.seatMap.setValue('');
    }
    if (selectedPricePlan && allPricePlans.length && !this.pricePlans.some((item) => this.getId(item) === selectedPricePlan)) {
      this.form.controls.pricePlan.setValue('');
    }
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
