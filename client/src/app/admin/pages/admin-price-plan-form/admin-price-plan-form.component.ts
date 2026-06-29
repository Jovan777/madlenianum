import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-price-plan-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-price-plan-form.component.html',
  styleUrl: './admin-price-plan-form.component.scss',
})
export class AdminPricePlanFormComponent implements OnInit {
  private readonly fb = inject(UntypedFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);

  readonly itemId = signal<string | null>(null);
  readonly options = signal<Record<string, any[]>>({});
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.group({
    name: ['', Validators.required],
    venue: [''],
    productionTypes: [[]],
    isPremiere: [false],
    currency: ['RSD', Validators.required],
    validFrom: [''],
    validTo: [''],
    status: ['active', Validators.required],
    notes: [''],
    rules: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.itemId.set(id);
    this.loadOptions();

    if (id) {
      this.loadItem(id);
    } else {
      this.addRule();
    }
  }

  get isEditMode(): boolean {
    return Boolean(this.itemId());
  }

  get rules(): UntypedFormArray {
    return this.form.get('rules') as UntypedFormArray;
  }

  get venues(): any[] {
    return this.options()['venues'] || [];
  }

  get priceCategories(): any[] {
    return this.options()['priceCategories'] || [];
  }

  get productionTypes(): any[] {
    return this.options()['productionTypes'] || [];
  }

  get statuses(): any[] {
    return this.options()['statuses'] || [];
  }

  ruleControls(): any[] {
    return this.rules.controls;
  }

  loadOptions(): void {
    this.api.getPricePlanFormOptions().subscribe({
      next: (response) => {
        this.options.set(response.options || {});
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Price plan options could not be loaded.');
      },
    });
  }

  loadItem(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.getItem<any>('price-plans', id).subscribe({
      next: (response) => this.patchForm(response.item),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Price plan could not be loaded.'),
      complete: () => this.isLoading.set(false),
    });
  }

  patchForm(item: any): void {
    this.form.patchValue({
      name: item.name || '',
      venue: this.getId(item.venue),
      productionTypes: item.productionTypes || [],
      isPremiere: Boolean(item.isPremiere),
      currency: item.currency || 'RSD',
      validFrom: this.toDateInput(item.validFrom),
      validTo: this.toDateInput(item.validTo),
      status: item.status || 'active',
      notes: item.notes || '',
    });

    this.rules.clear();
    (item.rules || []).forEach((rule: any) => this.addRule(rule));
    if (this.rules.length === 0) {
      this.addRule();
    }
  }

  addRule(rule: any = {}): void {
    this.rules.push(
      this.fb.group({
        priceCategory: [this.getId(rule.priceCategory), Validators.required],
        amount: [rule.amount ?? 0, [Validators.required, Validators.min(0)]],
        label: [rule.label || ''],
      })
    );
  }

  removeRule(index: number): void {
    this.rules.removeAt(index);
  }

  toggleProductionType(value: string, checked: boolean): void {
    const current = new Set(this.form.controls['productionTypes'].value || []);
    checked ? current.add(value) : current.delete(value);
    this.form.patchValue({ productionTypes: [...current] });
  }

  hasProductionType(value: string): boolean {
    return (this.form.controls['productionTypes'].value || []).includes(value);
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const id = this.itemId();
    const payload = this.buildPayload();
    const request = id ? this.api.update<any>('price-plans', id, payload) : this.api.create<any>('price-plans', payload);

    request.subscribe({
      next: (response) => {
        const savedId = this.getId(response.item);
        this.successMessage.set('Price plan saved.');

        if (!id && savedId) {
          this.router.navigate(['/admin/price-plans', savedId, 'edit']);
        }
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Price plan save failed.');
      },
      complete: () => {
        this.isSaving.set(false);
      },
    });
  }

  buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();

    return {
      name: raw.name,
      venue: raw.venue || undefined,
      productionTypes: raw.productionTypes || [],
      isPremiere: Boolean(raw.isPremiere),
      currency: raw.currency || 'RSD',
      validFrom: raw.validFrom ? new Date(raw.validFrom).toISOString() : undefined,
      validTo: raw.validTo ? new Date(raw.validTo).toISOString() : undefined,
      status: raw.status,
      notes: raw.notes,
      rules: this.rules.getRawValue()
        .map((rule: any) => ({
          priceCategory: rule.priceCategory,
          amount: Number(rule.amount || 0),
          label: rule.label || '',
        }))
        .filter((rule: any) => rule.priceCategory),
    };
  }

  getId(value: any): string {
    return String(value?._id || value?.id || value || '');
  }

  toDateInput(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }
}
