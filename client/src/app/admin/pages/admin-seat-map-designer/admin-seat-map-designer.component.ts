import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminApiService } from '../../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-seat-map-designer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-seat-map-designer.component.html',
  styleUrl: './admin-seat-map-designer.component.scss',
})
export class AdminSeatMapDesignerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminApiService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly seatMap = signal<any | null>(null);
  readonly seats = signal<any[]>([]);
  readonly priceCategories = signal<any[]>([]);
  readonly selectedSeat = signal<any | null>(null);
  readonly sectionFilter = signal('all');

  readonly editForm = this.fb.nonNullable.group({
    label: [''],
    section: [''],
    row: [''],
    number: [0],
    seatType: ['standard'],
    priceCategory: [''],
    x: [0],
    y: [0],
    width: [24],
    height: [24],
    rotation: [0],
    visualGroup: [''],
    isSellable: [true],
    isActive: [true],
  });

  readonly sections = computed(() => {
    const values = new Set<string>();
    this.seats().forEach((seat) => values.add(seat.section || 'Unknown'));
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'sr'));
  });

  readonly filteredSeats = computed(() => {
    const section = this.sectionFilter();

    if (section === 'all') {
      return this.seats();
    }

    return this.seats().filter((seat) => seat.section === section);
  });

  readonly canvasWidth = computed(() => Number(this.seatMap()?.canvas?.width || 1400));
  readonly canvasHeight = computed(() => Number(this.seatMap()?.canvas?.height || 1000));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Seat map id is missing.');
      return;
    }

    this.load(id);
  }


  reloadCurrent(): void {
    const id = this.getId(this.seatMap());

    if (id) {
      this.load(id);
    }
  }

  load(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    forkJoin({
      seatMap: this.api.getItem<any>('seat-maps', id),
      seats: this.api.getList<any>('seats', `seatMap=${id}&isActive=true`),
      categories: this.api.getList<any>('price-categories', 'status=active'),
    }).subscribe({
      next: ({ seatMap, seats, categories }) => {
        this.seatMap.set(seatMap.item);
        this.seats.set(seats.items || []);
        this.priceCategories.set(categories.items || []);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Seat map could not be loaded.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  selectSection(section: string): void {
    this.sectionFilter.set(section);
    this.selectedSeat.set(null);
  }

  selectSeat(seat: any): void {
    this.selectedSeat.set(seat);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.editForm.patchValue({
      label: seat.label || '',
      section: seat.section || '',
      row: seat.row || '',
      number: Number(seat.number || 0),
      seatType: seat.seatType || 'standard',
      priceCategory: this.getId(seat.priceCategory),
      x: Number(seat.x || 0),
      y: Number(seat.y || 0),
      width: Number(seat.width || 24),
      height: Number(seat.height || 24),
      rotation: Number(seat.rotation || 0),
      visualGroup: seat.visualGroup || '',
      isSellable: Boolean(seat.isSellable),
      isActive: Boolean(seat.isActive),
    });
  }

  saveSeat(): void {
    const seat = this.selectedSeat();

    if (!seat?._id || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const raw = this.editForm.getRawValue();
    const payload = {
      label: raw.label,
      section: raw.section,
      row: raw.row,
      number: Number(raw.number),
      seatType: raw.seatType,
      priceCategory: raw.priceCategory || undefined,
      x: Number(raw.x),
      y: Number(raw.y),
      width: Number(raw.width),
      height: Number(raw.height),
      rotation: Number(raw.rotation),
      visualGroup: raw.visualGroup,
      isSellable: raw.isSellable,
      isActive: raw.isActive,
    };

    this.api.update<any>('seats', seat._id, payload).subscribe({
      next: (response) => {
        this.replaceSeat(response.item);
        this.selectSeat(response.item);
        this.successMessage.set('Seat saved.');
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Seat save failed.');
      },
      complete: () => {
        this.isSaving.set(false);
      },
    });
  }

  moveSelected(deltaX: number, deltaY: number): void {
    const x = Number(this.editForm.controls.x.value || 0) + deltaX;
    const y = Number(this.editForm.controls.y.value || 0) + deltaY;

    this.editForm.patchValue({ x, y });
  }

  replaceSeat(updatedSeat: any): void {
    this.seats.update((items) => {
      return items.map((item) => (item._id === updatedSeat._id ? updatedSeat : item));
    });
  }

  seatStyle(seat: any): Record<string, string> {
    return {
      left: `${Number(seat.x || 0)}px`,
      top: `${Number(seat.y || 0)}px`,
      width: `${Number(seat.width || 24)}px`,
      height: `${Number(seat.height || 24)}px`,
      transform: `rotate(${Number(seat.rotation || 0)}deg)`,
    };
  }

  seatClass(seat: any): Record<string, boolean> {
    const selected = this.selectedSeat()?._id === seat._id;
    const categoryCode = String(seat.priceCategory?.code || '').toLowerCase();

    return {
      selected,
      inactive: !seat.isActive,
      unsellable: !seat.isSellable || seat.seatType === 'unavailable',
      box: ['box', 'central_box'].includes(seat.seatType),
      auxiliary: seat.seatType === 'auxiliary',
      category1: categoryCode === 'i',
      category2: categoryCode === 'ii',
      category3: categoryCode === 'iii',
    };
  }

  getId(value: any): string {
    return String(value?._id || value?.id || value || '');
  }
}
