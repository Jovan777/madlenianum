import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PublicEvent, PublicSeat } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';

interface GuestForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
}

@Component({
  selector: 'app-public-ticketing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './public-ticketing.component.html',
  styleUrl: './public-ticketing.component.scss',
})
export class PublicTicketingComponent implements OnInit, OnDestroy {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private timerId: number | null = null;

  readonly eventId = signal('');
  readonly event = signal<PublicEvent | null>(null);
  readonly seats = signal<PublicSeat[]>([]);
  readonly selectedSeatIds = signal<string[]>([]);
  readonly lockedSeatIds = signal<string[]>([]);
  readonly isLoading = signal(true);
  readonly isWorking = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly order = signal<any | null>(null);
  readonly mapSection = signal('all');
  readonly holdExpiresAt = signal('');
  readonly nowTick = signal(Date.now());

  readonly guestForm = signal<GuestForm>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: 'Beograd',
    country: 'Srbija',
  });

  readonly statusLegend = [
    { status: 'available', label: 'Slobodno' },
    { status: 'selected', label: 'Izabrano' },
    { status: 'locked', label: 'Zakljucano' },
    { status: 'reserved', label: 'Rezervisano' },
    { status: 'sold', label: 'Prodato' },
    { status: 'box_office_only', label: 'Samo blagajna' },
    { status: 'unavailable', label: 'Nedostupno' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('eventId') || '';
    this.eventId.set(id);
    this.loadSeats();
  }

  ngOnDestroy(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
    }
  }

  loadSeats(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.publicApi.getEventSeats(this.eventId()).subscribe({
      next: (response) => {
        this.event.set(response.event);
        this.seats.set(response.seats || []);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Sedista trenutno nisu dostupna.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  productionTitle(): string {
    const production = this.publicApi.productionFromEvent(this.event());
    return production?.title || 'Dogadjaj';
  }

  productionSlug(): string {
    return this.publicApi.productionFromEvent(this.event())?.slug || '';
  }

  productionType(): string {
    return this.publicApi.typeLabel(this.publicApi.productionFromEvent(this.event())?.type);
  }

  eventDate(): string {
    const startsAt = this.event()?.startsAt;
    if (!startsAt) return 'Termin ce biti objavljen';

    return new Date(startsAt).toLocaleString('sr-RS', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  venueName(): string {
    const event = this.event();
    return event?.venue?.name || event?.venue?.title || 'Madlenianum';
  }

  sections(): string[] {
    return [...new Set(this.seats().map((seat) => seat.section || 'Ostalo'))];
  }

  setSection(section: string): void {
    this.mapSection.set(section);
  }

  visibleSeats(): PublicSeat[] {
    const section = this.mapSection();
    if (section === 'all') return this.seats();
    return this.seats().filter((seat) => (seat.section || 'Ostalo') === section);
  }

  canvasWidth(): number {
    const configured = Number(this.event()?.seatMap?.canvas?.width || 0);
    const values = this.seats().map((seat) => seat.x || 0);
    return Math.max(configured, 980, ...values) + 90;
  }

  canvasHeight(): number {
    const configured = Number(this.event()?.seatMap?.canvas?.height || 0);
    const values = this.seats().map((seat) => seat.y || 0);
    return Math.max(configured, 640, ...values) + 90;
  }

  seatLeft(seat: PublicSeat): number {
    return ((seat.x || 0) / this.canvasWidth()) * 100;
  }

  seatTop(seat: PublicSeat): number {
    return ((seat.y || 0) / this.canvasHeight()) * 100;
  }

  seatWidth(seat: PublicSeat): number {
    return Math.max(18, Math.min(34, Number(seat.width || 24)));
  }

  seatHeight(seat: PublicSeat): number {
    return Math.max(18, Math.min(34, Number(seat.height || 24)));
  }

  seatClass(seat: PublicSeat): string {
    const classes = [`status-${seat.availabilityStatus}`];
    if (this.isSelected(seat.id)) classes.push('selected');
    if (this.lockedSeatIds().includes(String(seat.id))) classes.push('own-lock');
    return classes.join(' ');
  }

  seatTitle(seat: PublicSeat): string {
    const price = seat.price ? `${seat.price.amount.toLocaleString('sr-RS')} ${seat.price.currency}` : 'Bez cene';
    return `${seat.label} / ${this.statusLabel(seat.availabilityStatus)} / ${price}`;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      available: 'Slobodno',
      selected: 'Izabrano',
      locked: 'Zakljucano',
      reserved: 'Rezervisano',
      sold: 'Prodato',
      box_office_only: 'Samo blagajna',
      unavailable: 'Nedostupno',
    };

    return labels[status] || status;
  }

  isSelected(seatId: string): boolean {
    return this.selectedSeatIds().includes(String(seatId));
  }

  canSelect(seat: PublicSeat): boolean {
    return seat.availabilityStatus === 'available' && seat.isSellable !== false;
  }

  toggleSeat(seat: PublicSeat): void {
    if (!this.canSelect(seat)) return;

    const id = String(seat.id);
    const selected = this.selectedSeatIds();

    if (selected.includes(id)) {
      this.selectedSeatIds.set(selected.filter((item) => item !== id));
      return;
    }

    const max = this.event()?.maxTicketsPerOrder || 4;
    if (selected.length >= max) {
      this.errorMessage.set(`Maksimalan broj ulaznica je ${max}.`);
      return;
    }

    this.errorMessage.set('');
    this.selectedSeatIds.set([...selected, id]);
  }

  selectedSeats(): PublicSeat[] {
    const ids = new Set(this.selectedSeatIds());
    return this.seats().filter((seat) => ids.has(String(seat.id)));
  }

  selectedTotal(): number {
    return this.selectedSeats().reduce((sum, seat) => sum + (seat.price?.amount || 0), 0);
  }

  selectedCurrency(): string {
    return this.selectedSeats()[0]?.price?.currency || 'RSD';
  }

  availabilityCount(status: string): number {
    return this.seats().filter((seat) => seat.availabilityStatus === status).length;
  }

  holdExpiresLabel(): string {
    const expiresAt = this.holdExpiresAt();

    if (!expiresAt) {
      const minutes = this.event()?.lockDurationMinutes || 15;
      return `${minutes} min`;
    }

    const remainingMs = new Date(expiresAt).getTime() - this.nowTick();

    if (remainingMs <= 0) {
      return 'isteklo';
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  startHoldTimer(expiresAt: string): void {
    this.holdExpiresAt.set(expiresAt);

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
    }

    this.timerId = window.setInterval(() => {
      this.nowTick.set(Date.now());
    }, 1000);
  }

  lockSelectedSeats(): void {
    const seatIds = this.selectedSeatIds();
    if (seatIds.length === 0) {
      this.errorMessage.set('Izaberite bar jedno sediste.');
      return;
    }

    this.isWorking.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.publicApi.lockSeats(this.eventId(), seatIds).subscribe({
      next: (response) => {
        const locked = (response.seats || []).map((seat: any) => String(seat.seatId));
        this.lockedSeatIds.set(locked.length ? locked : seatIds);
        if (response.expiresAt) {
          this.startHoldTimer(response.expiresAt);
        }
        this.successMessage.set('Sedista su privremeno zadrzana. Unesite podatke i potvrdite kupovinu.');
        this.loadSeats();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Zakljucavanje sedista nije uspelo.');
      },
      complete: () => {
        this.isWorking.set(false);
      },
    });
  }

  releaseHeldSeats(): void {
    const seatIds = this.lockedSeatIds();

    if (!seatIds.length) {
      this.selectedSeatIds.set([]);
      return;
    }

    this.isWorking.set(true);
    this.publicApi.releaseSeats(this.eventId(), seatIds).subscribe({
      next: () => {
        this.selectedSeatIds.set([]);
        this.lockedSeatIds.set([]);
        this.holdExpiresAt.set('');
        this.successMessage.set('Izbor je oslobodjen.');
        this.loadSeats();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Oslobadjanje sedista nije uspelo.');
      },
      complete: () => {
        this.isWorking.set(false);
      },
    });
  }

  updateGuestField(field: keyof GuestForm, value: string): void {
    this.guestForm.update((form) => ({ ...form, [field]: value }));
  }

  createOrder(): void {
    const seatIds = this.lockedSeatIds();
    if (seatIds.length === 0) {
      this.errorMessage.set('Prvo zadrzite izabrana sedista.');
      return;
    }

    const form = this.guestForm();
    if (!form.fullName.trim() || !form.email.trim()) {
      this.errorMessage.set('Ime i email su obavezni.');
      return;
    }

    this.isWorking.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.publicApi
      .createGuestOrder({
        eventId: this.eventId(),
        seatIds,
        customerSnapshot: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          postalCode: form.postalCode,
          city: form.city,
          country: form.country,
        },
      })
      .subscribe({
        next: (response) => {
          this.order.set(response.order);
          this.selectedSeatIds.set([]);
          this.lockedSeatIds.set([]);
          this.holdExpiresAt.set('');
          this.successMessage.set('Porudzbina je potvrdjena.');
          const code = response.order?.orderCode || response.order?._id;
          if (code) {
            this.router.navigate(['/porudzbina', code]);
          } else {
            this.loadSeats();
          }
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Kreiranje porudzbine nije uspelo.');
        },
        complete: () => {
          this.isWorking.set(false);
        },
      });
  }

  refresh(): void {
    this.loadSeats();
  }
}
