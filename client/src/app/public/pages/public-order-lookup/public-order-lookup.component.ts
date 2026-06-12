import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-order-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './public-order-lookup.component.html',
  styleUrl: './public-order-lookup.component.scss',
})
export class PublicOrderLookupComponent implements OnInit {
  private readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);

  readonly identifier = signal('');
  readonly order = signal<any | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const routeIdentifier = this.route.snapshot.paramMap.get('identifier') || '';

    if (routeIdentifier) {
      this.identifier.set(routeIdentifier);
      this.lookup();
    }
  }

  lookup(): void {
    const value = this.identifier().trim();

    if (!value) {
      this.errorMessage.set('Unesite broj porudžbine.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.order.set(null);

    this.publicApi.getPublicOrder(value).subscribe({
      next: (response) => {
        this.order.set(response.order || response.item || null);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Porudžbina nije pronađena.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  eventTitle(order: any): string {
    return order?.event?.production?.title || 'Događaj';
  }

  eventDate(order: any): string {
    const value = order?.event?.startsAt;

    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('sr-RS');
  }
}
