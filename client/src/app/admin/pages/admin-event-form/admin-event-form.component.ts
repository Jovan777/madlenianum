import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  AdminEvent,
  AdminEventFormOptions,
  AdminPricePlan,
  AdminReference,
  AdminValidationIssue,
} from '../../../core/models/admin.models';
import { UnsavedChangesAware } from '../../../core/guards/unsaved-changes.guard';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';

interface SeatMapOption extends AdminReference {
  venue?: AdminReference;
  canvas?: { width?: number; height?: number };
  sections?: unknown[];
}

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
  private readonly notifications = inject(AdminNotificationService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isValidating = signal(false);
  readonly errorMessage = signal('');
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly warnings = signal<AdminValidationIssue[]>([]);
  readonly options = signal<AdminEventFormOptions | null>(null);
  readonly eventId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    production: ['', Validators.required],
    venue: ['', Validators.required],
    startsAt: ['', Validators.required],
    endsAt: [''],
    status: ['draft', Validators.required],
    saleStatus: ['not_started', Validators.required],
    saleStartsAt: [''],
    saleEndsAt: [''],
    seatMap: [''],
    pricePlan: [''],
    maxTicketsPerOrder: [4, [Validators.required, Validators.min(1), Validators.max(20)]],
    lockDurationMinutes: [15, [Validators.required, Validators.min(1), Validators.max(60)]],
    isPremiere: [false],
    badge: [''],
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
    if (id) this.loadEvent(id);

    this.form.controls.venue.valueChanges.subscribe(() => this.clearIncompatibleSelections());
    this.form.controls.production.valueChanges.subscribe(() => this.clearIncompatiblePricePlan());
    this.form.controls.isPremiere.valueChanges.subscribe(() => this.clearIncompatiblePricePlan());
    this.form.controls.saleStatus.valueChanges.subscribe(() => this.applyConditionalValidators());
    this.form.controls.ticketing.controls.provider.valueChanges.subscribe(() => this.applyProviderMode(true));
    this.form.controls.ticketing.controls.enabled.valueChanges.subscribe(() => this.applyConditionalValidators());
    this.applyConditionalValidators();
  }

  hasUnsavedChanges(): boolean { return this.form.dirty && !this.isSaving(); }

  @HostListener('window:beforeunload', ['$event'])
  preventAccidentalClose(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  get isEditMode(): boolean { return Boolean(this.eventId()); }
  get productions(): AdminReference[] { return this.options()?.productions || []; }
  get venues(): AdminReference[] { return this.options()?.venues || []; }
  get eventStatuses() { return this.options()?.eventStatuses || []; }
  get saleStatuses() { return this.options()?.saleStatuses || []; }
  get ticketingProviders() { return this.options()?.ticketingProviders || []; }
  get provider(): string { return this.form.controls.ticketing.controls.provider.value; }

  get seatMaps(): SeatMapOption[] {
    const venueId = this.form.controls.venue.value;
    return (this.options()?.seatMaps as SeatMapOption[] || []).filter((item) => !venueId || this.getId(item.venue) === venueId);
  }

  get pricePlans(): AdminPricePlan[] {
    const venueId = this.form.controls.venue.value;
    const productionType = this.productions.find((item) => item._id === this.form.controls.production.value)?.type;
    const isPremiere = this.form.controls.isPremiere.value;
    const selectedId = this.form.controls.pricePlan.value;
    return (this.options()?.pricePlans || []).filter((plan) => {
      if (plan._id === selectedId) return true;
      return this.isPricePlanCompatible(plan, venueId, productionType, isPremiere);
    });
  }

  selectedSeatMap(): SeatMapOption | null {
    return this.seatMaps.find((item) => this.getId(item) === this.form.controls.seatMap.value) || null;
  }

  selectedPricePlan(): AdminPricePlan | null {
    return this.pricePlans.find((item) => item._id === this.form.controls.pricePlan.value) || null;
  }

  formatRule(rule: AdminPricePlan['rules'][number]): string {
    const category = typeof rule.priceCategory === 'string' ? null : rule.priceCategory;
    return `${category ? `${category.code} / ${category.name}` : 'Kategorija'}: ${Number(rule.amount).toLocaleString('sr-RS')} ${this.selectedPricePlan()?.currency || 'RSD'}`;
  }

  loadOptions(): void {
    this.api.getEventFormOptions().subscribe({
      next: (response) => this.options.set(response.options),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Opcije za termin nisu dostupne.'),
    });
  }

  loadEvent(id: string): void {
    this.isLoading.set(true);
    this.api.getItem<AdminEvent>('events', id).subscribe({
      next: (response) => this.patchForm(response.item),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Termin nije moguće učitati.'),
      complete: () => this.isLoading.set(false),
    });
  }

  patchForm(item: AdminEvent): void {
    this.form.patchValue({
      production: this.getId(item.production), venue: this.getId(item.venue),
      startsAt: this.toDateTimeLocal(item.startsAt), endsAt: this.toDateTimeLocal(item.endsAt),
      status: item.status === 'finished' ? 'completed' : item.status,
      saleStatus: item.saleStatus === 'not_on_sale' ? 'not_started' : item.saleStatus === 'sales_closed' ? 'closed' : item.saleStatus,
      saleStartsAt: this.toDateTimeLocal(item.saleStartsAt), saleEndsAt: this.toDateTimeLocal(item.saleEndsAt),
      seatMap: this.getId(item.seatMap), pricePlan: this.getId(item.pricePlan),
      maxTicketsPerOrder: Number(item.maxTicketsPerOrder || 4), lockDurationMinutes: Number(item.lockDurationMinutes || 15),
      isPremiere: Boolean(item.isPremiere), badge: item.badge || '', notes: item.notes || '',
      ticketing: {
        enabled: Boolean(item.ticketing?.enabled), provider: item.ticketing?.provider || 'manual',
        legacyEventId: item.ticketing?.legacyEventId || '', externalCheckoutUrl: item.ticketing?.externalCheckoutUrl || '', note: item.ticketing?.note || '',
      },
    }, { emitEvent: false });
    this.applyConditionalValidators();
    this.form.markAsPristine();
  }

  validateOnly(): void {
    if (this.form.invalid || this.isValidating()) { this.form.markAllAsTouched(); return; }
    this.isValidating.set(true); this.clearMessages();
    this.api.validate('events', this.buildPayload(), this.eventId() || undefined).subscribe({
      next: (response) => {
        this.warnings.set(response.warnings || []);
        this.setFieldErrors(response.errors || []);
        if (response.valid) this.notifications.success('Konfiguracija termina je ispravna.');
      },
      error: (error) => this.handleServerError(error),
      complete: () => this.isValidating.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSaving()) { this.form.markAllAsTouched(); return; }
    this.isSaving.set(true); this.clearMessages();
    const id = this.eventId();
    const request = id
      ? this.api.update<AdminEvent>('events', id, this.buildPayload())
      : this.api.create<AdminEvent>('events', this.buildPayload());
    request.subscribe({
      next: (response) => {
        this.form.markAsPristine();
        this.notifications.success('Termin je sačuvan.');
        const savedId = response.item._id;
        if (!id && savedId) this.router.navigate(['/admin/events', savedId, 'edit']);
      },
      error: (error) => this.handleServerError(error),
      complete: () => this.isSaving.set(false),
    });
  }

  buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();
    const provider = raw.ticketing.provider;
    const internal = provider === 'internal';
    return {
      production: raw.production, venue: raw.venue,
      startsAt: raw.startsAt ? new Date(raw.startsAt).toISOString() : null,
      endsAt: raw.endsAt ? new Date(raw.endsAt).toISOString() : null,
      status: raw.status, saleStatus: raw.saleStatus,
      saleStartsAt: raw.saleStartsAt ? new Date(raw.saleStartsAt).toISOString() : null,
      saleEndsAt: raw.saleEndsAt ? new Date(raw.saleEndsAt).toISOString() : null,
      seatMap: internal ? raw.seatMap || null : null,
      pricePlan: internal && raw.saleStatus !== 'free' ? raw.pricePlan || null : null,
      maxTicketsPerOrder: Number(raw.maxTicketsPerOrder), lockDurationMinutes: Number(raw.lockDurationMinutes),
      isPremiere: raw.isPremiere, badge: raw.badge.trim(), notes: raw.notes.trim(),
      ticketing: {
        enabled: provider === 'manual' ? false : raw.ticketing.enabled,
        provider,
        legacyEventId: provider === 'legacy_php' ? raw.ticketing.legacyEventId.trim() : '',
        externalCheckoutUrl: provider === 'external' ? raw.ticketing.externalCheckoutUrl.trim() : '',
        note: raw.ticketing.note.trim(),
      },
    };
  }

  fieldError(path: string): string { return this.fieldErrors()[path] || ''; }
  getId(value: AdminReference | AdminPricePlan | string | null | undefined): string { return String((value as AdminReference)?._id || value || ''); }

  toDateTimeLocal(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private applyProviderMode(clearValues: boolean): void {
    const ticketing = this.form.controls.ticketing.controls;
    if (clearValues) {
      if (this.provider !== 'legacy_php') ticketing.legacyEventId.setValue('');
      if (this.provider !== 'external') ticketing.externalCheckoutUrl.setValue('');
      if (this.provider !== 'internal') {
        this.form.controls.seatMap.setValue('');
        this.form.controls.pricePlan.setValue('');
      }
      if (this.provider === 'manual') ticketing.enabled.setValue(false, { emitEvent: false });
    }
    this.applyConditionalValidators();
  }

  private applyConditionalValidators(): void {
    const enabled = this.form.controls.ticketing.controls.enabled.value;
    const legacy = this.form.controls.ticketing.controls.legacyEventId;
    const external = this.form.controls.ticketing.controls.externalCheckoutUrl;
    const seatMap = this.form.controls.seatMap;
    const pricePlan = this.form.controls.pricePlan;
    legacy.clearValidators(); external.clearValidators(); seatMap.clearValidators(); pricePlan.clearValidators();
    if (enabled && this.provider === 'internal') {
      seatMap.addValidators(Validators.required);
      if (this.form.controls.saleStatus.value !== 'free') pricePlan.addValidators(Validators.required);
    }
    if (enabled && this.provider === 'legacy_php') legacy.addValidators(Validators.required);
    if (enabled && this.provider === 'external') external.addValidators([Validators.required, Validators.pattern(/^https?:\/\/.+/i)]);
    [legacy, external, seatMap, pricePlan].forEach((control) => control.updateValueAndValidity({ emitEvent: false }));
  }

  private clearIncompatibleSelections(): void { this.clearIncompatibleSeatMap(); this.clearIncompatiblePricePlan(); }
  private clearIncompatibleSeatMap(): void {
    const selected = this.form.controls.seatMap.value;
    if (selected && this.options() && !this.seatMaps.some((item) => item._id === selected)) this.form.controls.seatMap.setValue('');
  }
  private clearIncompatiblePricePlan(): void {
    const selected = this.form.controls.pricePlan.value;
    if (!selected || !this.options()) return;
    const plan = this.options()!.pricePlans.find((item) => item._id === selected);
    const venueId = this.form.controls.venue.value;
    const productionType = this.productions.find((item) => item._id === this.form.controls.production.value)?.type;
    if (!plan || !this.isPricePlanCompatible(plan, venueId, productionType, this.form.controls.isPremiere.value)) {
      this.form.controls.pricePlan.setValue('');
    }
  }

  private isPricePlanCompatible(
    plan: AdminPricePlan,
    venueId: string,
    productionType: string | undefined,
    isPremiere: boolean,
  ): boolean {
    return (!venueId || this.getId(plan.venue) === venueId)
      && (!productionType || plan.productionTypes.includes(productionType))
      && plan.isPremiere === isPremiere
      && plan.status === 'active';
  }

  private clearMessages(): void { this.errorMessage.set(''); this.fieldErrors.set({}); this.warnings.set([]); }
  private setFieldErrors(issues: AdminValidationIssue[]): void {
    this.fieldErrors.set(Object.fromEntries(issues.map((item) => [item.field, item.message])));
  }
  private handleServerError(error: { error?: { message?: string; details?: { fields?: AdminValidationIssue[]; warnings?: AdminValidationIssue[] } } }): void {
    this.errorMessage.set(error?.error?.message || 'Čuvanje termina nije uspelo.');
    this.setFieldErrors(error?.error?.details?.fields || []);
    this.warnings.set(error?.error?.details?.warnings || []);
  }
}
