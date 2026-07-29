import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, finalize, Subscription } from 'rxjs';

import { PublicOrder, PublicOrderItem } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';

@Component({
  selector: 'app-public-order-lookup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PublicTranslatePipe],
  templateUrl: './public-order-lookup.component.html',
  styleUrl: './public-order-lookup.component.scss',
})
export class PublicOrderLookupComponent implements OnInit, OnDestroy {
  private readonly publicApi = inject(PublicApiService);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private routeSubscription?: Subscription;

  readonly order = signal<PublicOrder | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly lookupForm = this.fb.nonNullable.group({
    reference: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.routeSubscription = combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
    ]).subscribe(([params, queryParams]) => {
      const reference = params.get('identifier') || '';
      const token = queryParams.get('token') || '';
      if (!reference) return;
      this.lookupForm.controls.reference.setValue(reference);
      this.loadSecure(reference, token);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  lookup(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      this.errorMessage.set(this.i18n.t('order.enterDetails'));
      return;
    }
    this.startLoading();
    const { reference, email } = this.lookupForm.getRawValue();
    this.publicApi.lookupPublicOrder(reference.trim(), email.trim())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => this.order.set(response.order),
        error: (error) => {
          this.errorMessage.set(error?.error?.message || this.i18n.t('order.notFound'));
        },
      });
  }

  statusExplanation(order: PublicOrder): string {
    if (order.status === 'reserved') {
      return this.i18n.t('ticketing.reservedUntil');
    }
    if (order.status === 'pending_payment') {
      return this.i18n.t('ticketing.purchasePending');
    }
    if (order.status === 'paid') return this.i18n.t('order.paid');
    if (order.status === 'expired') return this.i18n.t('order.expired');
    if (order.status === 'cancelled') return this.i18n.t('order.cancelled');
    return this.i18n.t('order.recorded');
  }

  tickets(order: PublicOrder): PublicOrderItem[] {
    return order.items || [];
  }

  formatEventDate(value: string | null | undefined): string {
    if (!value) return this.i18n.t('order.dateUnavailable');
    return new Intl.DateTimeFormat(this.locale.isEnglish() ? 'en-GB' : 'sr-Latn-RS', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private loadSecure(reference: string, token: string): void {
    this.startLoading();
    this.publicApi.getPublicOrder(reference, token)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => this.order.set(response.order),
        error: (error) => {
          this.errorMessage.set(error?.error?.message || this.i18n.t('order.invalidLink'));
        },
      });
  }

  private startLoading(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.order.set(null);
  }
}
