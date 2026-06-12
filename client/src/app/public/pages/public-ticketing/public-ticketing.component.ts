import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
export class PublicTicketingComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);

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

  readonly guestForm = signal<GuestForm>({
    fullName: 'Test Kupac',
    email: 'test.kupac@example.com',
    phone: '+381601234567',
    address: 'Test adresa 1',
    postalCode: '11000',
    city: 'Beograd',
    country: 'Srbija',
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('eventId') || '';
    this.eventId.set(id);
    this.loadSeats();
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
        this.errorMessage.set(error?.error?.message || 'Sedišta trenutno nisu dostupna.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  productionTitle(): string {
    const event = this.event();
    if (!event?.production || typeof event.production === 'string') return 'Događaj';
    return event.production.title;
  }

  productionSlug(): string {
    const event = this.event();
    if (!event?.production || typeof event.production === 'string') return '';
    return event.production.slug;
  }

  productionType(): string {
    const event = this.event();
    if (!event?.production || typeof event.production === 'string') return 'Program';
    return event.production.type || 'Program';
  }

  eventDate(): string {
    const startsAt = this.event()?.startsAt;
    if (!startsAt) return 'Termin će biti objavljen';

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
    return this.seats().filter((seat) => seat.section === section);
  }

  canvasWidth(): number {
    const values = this.seats().map((seat) => seat.x || 0);
    return Math.max(1200, ...values) + 90;
  }

  canvasHeight(): number {
    const values = this.seats().map((seat) => seat.y || 0);
    return Math.max(850, ...values) + 90;
  }

  seatLeft(seat: PublicSeat): number {
    return ((seat.x || 0) / this.canvasWidth()) * 100;
  }

  seatTop(seat: PublicSeat): number {
    return ((seat.y || 0) / this.canvasHeight()) * 100;
  }

  seatClass(seat: PublicSeat): string {
    const classes = [`status-${seat.availabilityStatus}`];
    if (this.isSelected(seat.id)) classes.push('selected');
    if (this.lockedSeatIds().includes(String(seat.id))) classes.push('own-lock');
    return classes.join(' ');
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

  availabilityCount(status: string): number {
    return this.seats().filter((seat) => seat.availabilityStatus === status).length;
  }

  lockSelectedSeats(): void {
    const seatIds = this.selectedSeatIds();
    if (seatIds.length === 0) {
      this.errorMessage.set('Izaberite bar jedno sedište.');
      return;
    }

    this.isWorking.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.publicApi.lockSeats(this.eventId(), seatIds).subscribe({
      next: () => {
        this.lockedSeatIds.set(seatIds);
        this.successMessage.set('Sedišta su zaključana. Završite porudžbinu u narednih nekoliko minuta.');
        this.loadSeats();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Zaključavanje sedišta nije uspelo.');
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
      this.errorMessage.set('Prvo zaključajte izabrana sedišta.');
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
          this.successMessage.set('Porudžbina je uspešno kreirana.');
          this.loadSeats();
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Kreiranje porudžbine nije uspelo.');
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
