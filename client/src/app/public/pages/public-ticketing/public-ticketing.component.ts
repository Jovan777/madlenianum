import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PublicEvent, PublicOrder, PublicSeat } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicSeatMapComponent } from '../../components/public-seat-map/public-seat-map.component';
import { PublicTicketEventCardComponent } from '../../components/public-ticket-event-card/public-ticket-event-card.component';

type TicketStep = 1 | 2 | 3 | 4;
type OrderAction = 'reserve' | 'purchase';

@Component({
  selector: 'app-public-ticketing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PublicSeatMapComponent,
    PublicTicketEventCardComponent,
  ],
  templateUrl: './public-ticketing.component.html',
  styleUrl: './public-ticketing.component.scss',
})
export class PublicTicketingComponent implements OnInit, OnDestroy {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private timerId: number | null = null;

  readonly eventId = signal('');
  readonly event = signal<PublicEvent | null>(null);
  readonly seats = signal<PublicSeat[]>([]);
  readonly selectedSeatIds = signal<string[]>([]);
  readonly lockedSeatIds = signal<string[]>([]);
  readonly checkoutKey = signal('');
  readonly confirmedSeats = signal<PublicSeat[]>([]);
  readonly step = signal<TicketStep>(1);
  readonly desiredAction = signal<OrderAction>('reserve');
  readonly completedAction = signal<OrderAction | null>(null);
  readonly isLoading = signal(true);
  readonly isWorking = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly order = signal<PublicOrder | null>(null);
  readonly publicAccessToken = signal('');
  readonly emailStatus = signal('');
  readonly holdExpiresAt = signal('');
  readonly nowTick = signal(Date.now());

  readonly customerForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phone: ['', [Validators.maxLength(40)]],
  });

  ngOnInit(): void {
    this.eventId.set(this.route.snapshot.paramMap.get('eventId') || '');
    this.loadSeats(true, true);
  }

  ngOnDestroy(): void {
    this.stopHoldTimer();
  }

  loadSeats(showLoading = false, restoreLocks = false): void {
    if (showLoading) this.isLoading.set(true);
    this.errorMessage.set('');
    this.publicApi.getEventSeats(this.eventId())
      .pipe(finalize(() => {
        if (showLoading) this.isLoading.set(false);
      }))
      .subscribe({
        next: (response) => {
          this.event.set(response.event);
          this.seats.set(response.seats || []);
          if (restoreLocks) this.restoreCheckout();
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Sedišta trenutno nisu dostupna.');
        },
      });
  }

  canvasWidth(): number {
    const configured = Number(this.event()?.seatMap?.canvas?.width || 0);
    const furthestSeat = Math.max(0, ...this.seats().map((seat) => Number(seat.x || 0)));
    return Math.max(configured, furthestSeat + 70, 900);
  }

  canvasHeight(): number {
    const configured = Number(this.event()?.seatMap?.canvas?.height || 0);
    const furthestSeat = Math.max(0, ...this.seats().map((seat) => Number(seat.y || 0)));
    return Math.max(configured, furthestSeat + 70, 620);
  }

  availabilityCount(): number {
    return this.seats().filter(
      (seat) => seat.availabilityStatus === 'available' && seat.isSellable !== false
    ).length;
  }

  onSelectionChange(seatIds: string[]): void {
    this.errorMessage.set('');
    this.selectedSeatIds.set(seatIds);
  }

  selectedSeats(): PublicSeat[] {
    const selectedIds = new Set(this.selectedSeatIds());
    return this.seats().filter((seat) => selectedIds.has(String(seat.id)));
  }

  selectedTotal(seats = this.selectedSeats()): number {
    return seats.reduce((sum, seat) => sum + Number(seat.price?.amount || 0), 0);
  }

  selectedCurrency(seats = this.selectedSeats()): string {
    return seats[0]?.price?.currency || this.order()?.currency || 'RSD';
  }

  beginCheckout(action: OrderAction): void {
    if (!this.selectedSeatIds().length) {
      this.errorMessage.set('Izaberite bar jedno sedište.');
      return;
    }
    this.desiredAction.set(action);
    this.lockSelectedSeats();
  }

  lockSelectedSeats(): void {
    const seatIds = this.selectedSeatIds();
    if (!seatIds.length || this.isWorking()) return;
    const checkoutKey = this.createRequestKey();
    this.isWorking.set(true);
    this.clearMessages();
    this.publicApi.lockSeats(this.eventId(), seatIds, checkoutKey)
      .pipe(finalize(() => this.isWorking.set(false)))
      .subscribe({
        next: (response) => {
          const locked = response.seats.map((seat) => String(seat.seatId));
          this.lockedSeatIds.set(locked.length ? locked : seatIds);
          this.checkoutKey.set(response.checkoutKey || checkoutKey);
          this.startHoldTimer(response.expiresAt);
          this.step.set(2);
          this.successMessage.set('Sedišta su privremeno sačuvana dok unosite podatke.');
          this.loadSeats();
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Čuvanje sedišta nije uspelo.');
          if (error?.error?.details?.refreshSeats) this.loadSeats();
        },
      });
  }

  continueToReview(): void {
    this.clearMessages();
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.errorMessage.set('Popunite ime, prezime i email.');
      return;
    }
    if (!this.lockedSeatIds().length) {
      this.errorMessage.set('Čuvanje sedišta je isteklo. Izaberite sedišta ponovo.');
      this.step.set(1);
      return;
    }
    this.step.set(3);
  }

  submitOrder(action: OrderAction): void {
    if (
      this.customerForm.invalid
      || !this.lockedSeatIds().length
      || !this.checkoutKey()
      || this.isWorking()
    ) {
      this.customerForm.markAllAsTouched();
      return;
    }
    const selectedSeats = this.selectedSeats();
    this.desiredAction.set(action);
    this.isWorking.set(true);
    this.clearMessages();
    this.publicApi.createGuestOrder({
      eventId: this.eventId(),
      seatIds: this.lockedSeatIds(),
      action,
      customerSnapshot: this.customerForm.getRawValue(),
      checkoutKey: this.checkoutKey(),
      idempotencyKey: this.checkoutKey(),
    })
      .pipe(finalize(() => this.isWorking.set(false)))
      .subscribe({
        next: (response) => {
          this.confirmedSeats.set(selectedSeats);
          this.order.set(response.order);
          this.completedAction.set(response.action);
          this.publicAccessToken.set(response.accessToken || '');
          this.emailStatus.set(response.emailStatus || '');
          this.selectedSeatIds.set([]);
          this.lockedSeatIds.set([]);
          this.checkoutKey.set('');
          this.holdExpiresAt.set('');
          this.stopHoldTimer();
          this.step.set(4);
          this.successMessage.set(
            response.action === 'purchase'
              ? 'Kupovina je pokrenuta. Plaćanje još nije evidentirano.'
              : 'Rezervacija je uspešno potvrđena.'
          );
          this.loadSeats();
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Potvrda nije uspela.');
          if (error?.error?.details?.refreshSeats) {
            this.lockedSeatIds.set([]);
            this.checkoutKey.set('');
            this.step.set(1);
            this.loadSeats();
          }
        },
      });
  }

  backToCustomer(): void {
    this.clearMessages();
    this.step.set(2);
  }

  backToSeats(): void {
    this.releaseHeldSeats(true);
  }

  resetSelection(): void {
    this.releaseHeldSeats(false);
  }

  releaseHeldSeats(goToFirstStep: boolean): void {
    const seatIds = this.lockedSeatIds();
    if (!seatIds.length) {
      this.selectedSeatIds.set([]);
      if (goToFirstStep) this.step.set(1);
      return;
    }
    this.isWorking.set(true);
    this.clearMessages();
    this.publicApi.releaseSeats(this.eventId(), seatIds, this.checkoutKey())
      .pipe(finalize(() => this.isWorking.set(false)))
      .subscribe({
        next: () => {
          this.selectedSeatIds.set([]);
          this.lockedSeatIds.set([]);
          this.checkoutKey.set('');
          this.holdExpiresAt.set('');
          this.stopHoldTimer();
          if (goToFirstStep) this.step.set(1);
          this.successMessage.set('Sedišta su oslobođena.');
          this.loadSeats();
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Oslobađanje sedišta nije uspelo.');
        },
      });
  }

  holdExpiresLabel(): string {
    if (!this.holdExpiresAt()) return `${this.event()?.lockDurationMinutes || 15} min`;
    const remainingMs = new Date(this.holdExpiresAt()).getTime() - this.nowTick();
    if (remainingMs <= 0) return 'isteklo';
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  orderReference(): string {
    return this.order()?.reference || '';
  }

  completedStatusLabel(): string {
    return this.order()?.statusLabel
      || (this.completedAction() === 'purchase' ? 'Kupovina u toku' : 'Rezervisano');
  }

  fieldError(field: keyof typeof this.customerForm.controls): string {
    const control = this.customerForm.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'Polje je obavezno.';
    if (control.errors['email']) return 'Unesite ispravnu email adresu.';
    return 'Vrednost nije ispravna.';
  }

  private restoreCheckout(): void {
    this.publicApi.restoreSeatLocks(this.eventId()).subscribe({
      next: (response) => {
        if (!response.restored || !response.seats.length) return;
        const seatIds = response.seats.map((seat) => String(seat.seatId));
        this.selectedSeatIds.set(seatIds);
        this.lockedSeatIds.set(seatIds);
        this.checkoutKey.set(response.checkoutKey || '');
        this.startHoldTimer(response.expiresAt);
        this.step.set(2);
        this.successMessage.set('Nastavili ste prethodno započetu rezervaciju sedišta.');
      },
    });
  }

  private startHoldTimer(expiresAt: string): void {
    this.holdExpiresAt.set(expiresAt);
    this.stopHoldTimer();
    this.timerId = window.setInterval(() => {
      const now = Date.now();
      this.nowTick.set(now);
      if (new Date(this.holdExpiresAt()).getTime() <= now) {
        this.stopHoldTimer();
        this.lockedSeatIds.set([]);
        this.selectedSeatIds.set([]);
        this.checkoutKey.set('');
        this.step.set(1);
        this.errorMessage.set('Vreme za potvrdu je isteklo. Izaberite sedišta ponovo.');
        this.loadSeats();
      }
    }, 1000);
  }

  private stopHoldTimer(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private createRequestKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}
