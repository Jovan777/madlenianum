import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-order-detail.component.html',
  styleUrl: './admin-order-detail.component.scss',
})
export class AdminOrderDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly order = signal<any | null>(null);

  selectedStatus = 'reserved';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: AdminApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Order id is missing.');
      return;
    }

    this.load(id);
  }

  load(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.getItem<any>('orders', id).subscribe({
      next: (response) => {
        this.order.set(response.item);
        this.selectedStatus = response.item?.status || 'reserved';
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Order could not be loaded.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  saveStatus(): void {
    const item = this.order();

    if (!item?._id) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.api.updateOrderStatus(item._id, { status: this.selectedStatus }).subscribe({
      next: (response) => {
        this.order.set(response.item);
        this.successMessage.set('Order status updated.');
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Order status could not be updated.');
      },
      complete: () => {
        this.isSaving.set(false);
      },
    });
  }

  formatDate(value: string | Date | undefined): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('sr-RS');
  }
}
