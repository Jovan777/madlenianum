import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AdminOrder } from '../../../core/models/admin.models';
import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-order-detail.component.html',
  styleUrl: './admin-order-detail.component.scss',
})
export class AdminOrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly order = signal<AdminOrder | null>(null);

  readonly actionForm = this.fb.nonNullable.group({
    reason: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Nedostaje ID porudžbine.');
      return;
    }
    this.load(id);
  }

  load(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.api.getOrder(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => this.order.set(response.item),
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Porudžbina nije učitana.');
        },
      });
  }

  canCancel(item: AdminOrder): boolean {
    return ['pending', 'reserved', 'pending_payment'].includes(item.status);
  }

  canMarkPaid(item: AdminOrder): boolean {
    return ['reserved', 'pending_payment'].includes(item.status);
  }

  cancel(): void {
    const item = this.order();
    if (!item || !this.canCancel(item)) return;
    if (!window.confirm('Otkazati porudžbinu i osloboditi sedišta?')) return;
    this.runAction(() => this.api.cancelOrder(item.id, this.actionForm.controls.reason.value));
  }

  markPaid(): void {
    const item = this.order();
    if (!item || !this.canMarkPaid(item)) return;
    if (!window.confirm('Potvrditi da je plaćanje zaista primljeno?')) return;
    this.runAction(() => this.api.markOrderPaid(item.id, this.actionForm.controls.reason.value));
  }

  resend(): void {
    const item = this.order();
    if (!item) return;
    this.isSaving.set(true);
    this.clearMessages();
    this.api.resendOrderConfirmation(item.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          this.successMessage.set(response.message);
          this.load(item.id);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Email nije ponovo poslat.');
        },
      });
  }

  copyPublicLink(): void {
    const item = this.order();
    if (!item) return;
    this.isSaving.set(true);
    this.clearMessages();
    this.api.createOrderPublicLink(item.id)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: async (response) => {
          try {
            await navigator.clipboard.writeText(response.url);
            this.successMessage.set('Bezbedan link je kopiran.');
          } catch {
            this.successMessage.set(`Bezbedan link: ${response.url}`);
          }
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Link nije kreiran.');
        },
      });
  }

  private runAction(request: () => ReturnType<AdminApiService['cancelOrder']>): void {
    this.isSaving.set(true);
    this.clearMessages();
    request()
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          this.order.set(response.item);
          this.actionForm.reset();
          this.successMessage.set('Status je ažuriran.');
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Akcija nije izvršena.');
        },
      });
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
