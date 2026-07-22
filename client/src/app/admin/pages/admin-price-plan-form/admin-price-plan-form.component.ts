import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  AdminPriceCategory,
  AdminPricePlan,
  AdminPricePlanFormOptions,
  AdminUsage,
  AdminValidationIssue,
} from '../../../core/models/admin.models';
import { UnsavedChangesAware } from '../../../core/guards/unsaved-changes.guard';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';

type PriceRuleForm = FormGroup<{
  priceCategory: FormControl<string>;
  amount: FormControl<number>;
  label: FormControl<string>;
}>;

@Component({
  selector: 'app-admin-price-plan-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-price-plan-form.component.html',
  styleUrl: './admin-price-plan-form.component.scss',
})
export class AdminPricePlanFormComponent implements OnInit, UnsavedChangesAware {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);
  private readonly notifications = inject(AdminNotificationService);

  readonly itemId = signal<string | null>(null);
  readonly options = signal<AdminPricePlanFormOptions | null>(null);
  readonly usage = signal<AdminUsage | null>(null);
  readonly revision = signal(1);
  readonly parentPlanName = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isValidating = signal(false);
  readonly errorMessage = signal('');
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly warnings = signal<AdminValidationIssue[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    venue: ['', Validators.required],
    productionTypes: this.fb.nonNullable.control<string[]>([], Validators.required),
    isPremiere: [false],
    currency: ['RSD', Validators.required],
    validFrom: [''],
    validTo: [''],
    status: ['draft', Validators.required],
    notes: [''],
    rules: this.fb.array<PriceRuleForm>([], Validators.minLength(1)),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.itemId.set(id);
    this.loadOptions();
    if (id) this.loadItem(id); else this.addRule();
  }

  hasUnsavedChanges(): boolean { return this.form.dirty && !this.isSaving(); }

  @HostListener('window:beforeunload', ['$event'])
  preventAccidentalClose(event: BeforeUnloadEvent): void { if (this.hasUnsavedChanges()) event.preventDefault(); }

  get isEditMode(): boolean { return Boolean(this.itemId()); }
  get criticalLocked(): boolean { return Boolean(this.usage()?.hasUsage); }
  get rules(): FormArray<PriceRuleForm> { return this.form.controls.rules; }
  get venues() { return this.options()?.venues || []; }
  get priceCategories() { return this.options()?.priceCategories || []; }
  get productionTypes() { return this.options()?.productionTypes || []; }
  get statuses() { return this.options()?.statuses || []; }

  loadOptions(): void {
    this.api.getPricePlanFormOptions().subscribe({
      next: (response) => this.options.set(response.options),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Opcije cenovnika nisu učitane.'),
    });
  }

  loadItem(id: string): void {
    this.isLoading.set(true);
    this.api.getItem<AdminPricePlan>('price-plans', id).subscribe({
      next: (response) => {
        this.usage.set(response.meta?.['usage'] as AdminUsage || null);
        this.patchForm(response.item);
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Cenovnik nije učitan.'),
      complete: () => this.isLoading.set(false),
    });
  }

  patchForm(item: AdminPricePlan): void {
    this.revision.set(item.revision || 1);
    this.parentPlanName.set(item.parentPlan?.name || '');
    this.form.patchValue({
      name: item.name || '', venue: this.getId(item.venue), productionTypes: item.productionTypes || [],
      isPremiere: Boolean(item.isPremiere), currency: item.currency || 'RSD',
      validFrom: this.toDateInput(item.validFrom), validTo: this.toDateInput(item.validTo),
      status: item.status || 'draft', notes: item.notes || '',
    });
    this.rules.clear();
    (item.rules || []).forEach((rule) => this.addRule({
      priceCategory: this.getId(rule.priceCategory), amount: rule.amount, label: rule.label || '',
    }, true));
    if (!this.rules.length) this.addRule({}, true);
    if (this.criticalLocked) this.lockCriticalControls();
    this.form.markAsPristine();
  }

  addRule(rule: { priceCategory?: string; amount?: number; label?: string } = {}, hydrating = false): void {
    if (this.criticalLocked && !hydrating) return;
    this.rules.push(this.fb.nonNullable.group({
      priceCategory: [rule.priceCategory || '', Validators.required],
      amount: [rule.amount ?? 0, [Validators.required, Validators.min(0)]],
      label: [rule.label || ''],
    }));
  }

  removeRule(index: number): void {
    if (!this.criticalLocked && this.rules.length > 1) this.rules.removeAt(index);
  }

  categoriesForRule(index: number): AdminPriceCategory[] {
    const selected = this.rules.at(index)?.get('priceCategory')?.value;
    return this.priceCategories.filter((category) => category.status === 'active' || category._id === selected);
  }

  toggleProductionType(value: string, checked: boolean): void {
    if (this.criticalLocked) return;
    const current = new Set(this.form.controls.productionTypes.value);
    checked ? current.add(value) : current.delete(value);
    this.form.controls.productionTypes.setValue([...current]);
    this.form.controls.productionTypes.markAsDirty();
  }

  onProductionTypeChange(value: string, event: Event): void {
    this.toggleProductionType(value, (event.target as HTMLInputElement).checked);
  }

  hasProductionType(value: string): boolean { return this.form.controls.productionTypes.value.includes(value); }

  validateOnly(): void {
    if (!this.validateClient() || this.isValidating()) return;
    this.isValidating.set(true); this.clearMessages();
    this.api.validate('price-plans', this.buildPayload(), this.itemId() || undefined).subscribe({
      next: (response) => {
        this.warnings.set(response.warnings || []); this.setFieldErrors(response.errors || []);
        if (response.valid) this.notifications.success('Cenovnik je ispravan.');
      },
      error: (error) => this.handleServerError(error),
      complete: () => this.isValidating.set(false),
    });
  }

  save(): void {
    if (!this.validateClient() || this.isSaving()) return;
    this.isSaving.set(true); this.clearMessages();
    const id = this.itemId();
    const request = id
      ? this.api.update<AdminPricePlan>('price-plans', id, this.buildPayload())
      : this.api.create<AdminPricePlan>('price-plans', this.buildPayload());
    request.subscribe({
      next: (response) => {
        this.form.markAsPristine(); this.notifications.success('Cenovnik je sačuvan.');
        if (!id) this.router.navigate(['/admin/price-plans', response.item._id, 'edit']);
      },
      error: (error) => this.handleServerError(error),
      complete: () => this.isSaving.set(false),
    });
  }

  createVersion(): void {
    const id = this.itemId();
    if (!id || !window.confirm('Napraviti novu verziju? Postojeći termini neće biti promenjeni.')) return;
    this.api.duplicate<AdminPricePlan>('price-plans', id).subscribe({
      next: (response) => {
        this.form.markAsPristine(); this.notifications.success('Nova verzija je napravljena kao nacrt.');
        this.router.navigate(['/admin/price-plans', response.item._id, 'edit']);
      },
      error: (error) => this.notifications.error(error?.error?.message || 'Nova verzija nije napravljena.'),
    });
  }

  buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();
    return {
      name: raw.name.trim(), venue: raw.venue, productionTypes: raw.productionTypes,
      isPremiere: raw.isPremiere, currency: raw.currency,
      validFrom: raw.validFrom ? new Date(`${raw.validFrom}T00:00:00`).toISOString() : null,
      validTo: raw.validTo ? new Date(`${raw.validTo}T23:59:59`).toISOString() : null,
      status: raw.status, notes: raw.notes.trim(),
      rules: raw.rules.map((rule) => ({ priceCategory: rule.priceCategory, amount: Number(rule.amount), label: rule.label.trim() })),
    };
  }

  fieldError(path: string): string { return this.fieldErrors()[path] || ''; }
  getId(value: { _id?: string } | string | null | undefined): string { return String((value as { _id?: string })?._id || value || ''); }
  toDateInput(value: unknown): string { if (!value) return ''; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10); }

  private validateClient(): boolean {
    this.form.markAllAsTouched();
    const raw = this.form.getRawValue();
    if (this.form.invalid) return false;
    if (raw.validFrom && raw.validTo && raw.validTo < raw.validFrom) {
      this.fieldErrors.set({ validTo: 'Kraj važenja ne može biti pre početka.' }); return false;
    }
    const ids = raw.rules.map((rule) => rule.priceCategory).filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      this.fieldErrors.set({ rules: 'Ista kategorija ne može biti dodata više puta.' }); return false;
    }
    return true;
  }

  private lockCriticalControls(): void {
    ['venue', 'productionTypes', 'isPremiere', 'currency', 'validFrom', 'validTo'].forEach((name) => this.form.get(name)?.disable({ emitEvent: false }));
    this.rules.disable({ emitEvent: false });
  }
  private clearMessages(): void { this.errorMessage.set(''); this.fieldErrors.set({}); this.warnings.set([]); }
  private setFieldErrors(issues: AdminValidationIssue[]): void { this.fieldErrors.set(Object.fromEntries(issues.map((item) => [item.field, item.message]))); }
  private handleServerError(error: { error?: { message?: string; details?: { fields?: AdminValidationIssue[]; warnings?: AdminValidationIssue[] } } }): void {
    this.errorMessage.set(error?.error?.message || 'Čuvanje cenovnika nije uspelo.');
    this.setFieldErrors(error?.error?.details?.fields || []); this.warnings.set(error?.error?.details?.warnings || []);
  }
}
