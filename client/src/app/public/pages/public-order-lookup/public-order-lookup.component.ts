import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { PublicOrder, PublicOrderItem } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-order-lookup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './public-order-lookup.component.html',
  styleUrl: './public-order-lookup.component.scss',
})
export class PublicOrderLookupComponent implements OnInit {
  private readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly order = signal<PublicOrder | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly lookupForm = this.fb.nonNullable.group({
    reference: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    const reference = this.route.snapshot.paramMap.get('identifier') || '';
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!reference) return;
    this.lookupForm.controls.reference.setValue(reference);
    this.loadSecure(reference, token);
  }

  lookup(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      this.errorMessage.set('Unesite broj potvrde i email korišćen pri rezervaciji.');
      return;
    }
    this.startLoading();
    const { reference, email } = this.lookupForm.getRawValue();
    this.publicApi.lookupPublicOrder(reference.trim(), email.trim())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => this.order.set(response.order),
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Porudžbina nije pronađena.');
        },
      });
  }

  statusExplanation(order: PublicOrder): string {
    if (order.status === 'reserved') {
      return 'Sedišta su rezervisana do navedenog roka.';
    }
    if (order.status === 'pending_payment') {
      return 'Kupovina je pokrenuta, ali plaćanje još nije potvrđeno.';
    }
    if (order.status === 'paid') return 'Plaćanje je evidentirano i sedišta su potvrđena.';
    if (order.status === 'expired') return 'Rok je istekao i sedišta su oslobođena.';
    if (order.status === 'cancelled') return 'Porudžbina ili rezervacija je otkazana.';
    return 'Zahtev je evidentiran u sistemu.';
  }

  tickets(order: PublicOrder): PublicOrderItem[] {
    return order.items || [];
  }

  formatEventDate(value: string | null | undefined): string {
    if (!value) return 'Datum nije dostupan';
    return new Intl.DateTimeFormat('sr-Latn-RS', {
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
          this.errorMessage.set(error?.error?.message || 'Link nije važeći. Unesite email za proveru.');
        },
      });
  }

  private startLoading(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.order.set(null);
  }
}
