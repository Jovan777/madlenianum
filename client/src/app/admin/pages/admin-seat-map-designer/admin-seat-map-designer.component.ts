import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  AdminPriceCategory,
  AdminSeat,
  AdminSeatMap,
} from '../../../core/models/admin.models';
import { UnsavedChangesAware } from '../../../core/guards/unsaved-changes.guard';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { AdminSeatMapCanvasComponent } from '../../components/admin-seat-map-canvas/admin-seat-map-canvas.component';

type BulkField =
  | 'section'
  | 'row'
  | 'seatType'
  | 'priceCategory'
  | 'isActive'
  | 'isSellable'
  | 'isAccessible'
  | 'hasRestrictedView'
  | 'physicalNote';

@Component({
  selector: 'app-admin-seat-map-designer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AdminSeatMapCanvasComponent],
  templateUrl: './admin-seat-map-designer.component.html',
  styleUrl: './admin-seat-map-designer.component.scss',
})
export class AdminSeatMapDesignerComponent implements OnInit, UnsavedChangesAware {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminApiService);
  private readonly notifications = inject(AdminNotificationService);

  readonly seatMapId = signal('');
  readonly seatMap = signal<AdminSeatMap | null>(null);
  readonly seats = signal<AdminSeat[]>([]);
  readonly priceCategories = signal<AdminPriceCategory[]>([]);
  readonly selectedIds = signal<string[]>([]);
  readonly sectionFilter = signal('all');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly positionDirty = signal(false);
  readonly bulkFields = signal<Set<BulkField>>(new Set());

  readonly selectedSeats = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.seats().filter((seat) => ids.has(this.seatId(seat)));
  });

  readonly sectionNames = computed(() => [
    ...new Set(this.seats().map((seat) => seat.section).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right, 'sr')));

  readonly inspectorForm = this.fb.nonNullable.group({
    label: [''],
    section: [''],
    row: [''],
    number: [0],
    seatType: ['standard'],
    priceCategory: [''],
    x: [0],
    y: [0],
    width: [30],
    height: [30],
    rotation: [0],
    isActive: [true],
    isSellable: [true],
    isAccessible: [false],
    hasRestrictedView: [false],
    physicalNote: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.seatMapId.set(id);
    if (!id) {
      this.errorMessage.set('Nedostaje ID mape sedišta.');
      return;
    }
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    forkJoin({
      preview: this.api.getSeatMapPreview(this.seatMapId()),
      categories: this.api.getList<AdminPriceCategory>('price-categories', 'status=active&limit=100'),
    }).subscribe({
      next: ({ preview, categories }) => {
        this.seatMap.set(preview.item.seatMap);
        this.seats.set((preview.item.seats || []).map((seat) => this.normalizeSeat(seat)));
        this.priceCategories.set(categories.items || []);
        this.selectedIds.set([]);
        this.positionDirty.set(false);
        this.inspectorForm.markAsPristine();
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Mapa sedišta nije učitana.'),
      complete: () => this.isLoading.set(false),
    });
  }

  onSelectionChange(ids: string[]): void {
    this.selectedIds.set(ids);
    this.bulkFields.set(new Set());
    const selected = this.selectedSeats();
    if (!selected.length) return;
    const first = selected[0];
    this.inspectorForm.reset({
      label: first.label || '',
      section: first.section || '',
      row: first.row || '',
      number: Number(first.number || 0),
      seatType: first.seatType || 'standard',
      priceCategory: this.idOf(first.priceCategory),
      x: Number(first.x || 0),
      y: Number(first.y || 0),
      width: Number(first.width || 30),
      height: Number(first.height || 30),
      rotation: Number(first.rotation || 0),
      isActive: first.isActive !== false,
      isSellable: first.baseIsSellable ?? first.isSellable,
      isAccessible: Boolean(first.isAccessible),
      hasRestrictedView: Boolean(first.hasRestrictedView),
      physicalNote: first.physicalNote || '',
    });
  }

  toggleBulkField(field: BulkField, checked: boolean): void {
    this.bulkFields.update((current) => {
      const next = new Set(current);
      checked ? next.add(field) : next.delete(field);
      return next;
    });
  }

  checkboxValue(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  mixed(field: keyof AdminSeat): boolean {
    const selected = this.selectedSeats();
    if (selected.length < 2) return false;
    const first = JSON.stringify(selected[0][field]);
    return selected.slice(1).some((seat) => JSON.stringify(seat[field]) !== first);
  }

  nudge(deltaX: number, deltaY: number): void {
    if (!this.selectedIds().length) return;
    const ids = new Set(this.selectedIds());
    this.seats.update((items) => items.map((seat) => ids.has(this.seatId(seat))
      ? { ...seat, x: Number(seat.x) + deltaX, y: Number(seat.y) + deltaY }
      : seat
    ));
    this.positionDirty.set(true);
    if (this.selectedSeats().length === 1) {
      const seat = this.selectedSeats()[0];
      this.inspectorForm.patchValue({ x: seat.x, y: seat.y });
    }
  }

  saveSelection(): void {
    const selected = this.selectedSeats();
    if (!selected.length || this.isSaving()) return;
    const raw = this.inspectorForm.getRawValue();
    const changes: Partial<AdminSeat> = {};
    const isSingle = selected.length === 1;
    const include = (field: BulkField) => isSingle || this.bulkFields().has(field);

    if (isSingle) {
      Object.assign(changes, {
        label: raw.label.trim(),
        number: Number(raw.number),
        x: Number(raw.x),
        y: Number(raw.y),
        width: Number(raw.width),
        height: Number(raw.height),
        rotation: Number(raw.rotation),
      });
    }
    if (include('section')) changes.section = raw.section.trim();
    if (include('row')) changes.row = raw.row.trim();
    if (include('seatType')) changes.seatType = raw.seatType;
    if (include('priceCategory')) {
      changes.priceCategory = raw.priceCategory
        ? this.priceCategories().find((item) => item._id === raw.priceCategory) || null
        : null;
    }
    if (include('isActive')) changes.isActive = raw.isActive;
    if (include('isSellable')) changes.baseIsSellable = raw.isSellable;
    if (include('isAccessible')) changes.isAccessible = raw.isAccessible;
    if (include('hasRestrictedView')) changes.hasRestrictedView = raw.hasRestrictedView;
    if (include('physicalNote')) changes.physicalNote = raw.physicalNote.trim();

    const apiChanges: Record<string, unknown> = { ...changes };
    if ('baseIsSellable' in apiChanges) {
      apiChanges['isSellable'] = apiChanges['baseIsSellable'];
      delete apiChanges['baseIsSellable'];
    }
    if ('priceCategory' in apiChanges) {
      apiChanges['priceCategory'] = this.idOf(changes.priceCategory);
    }
    const positionUpdates = this.positionDirty()
      ? selected.map((seat) => ({
          seatId: this.seatId(seat),
          changes: { x: seat.x, y: seat.y },
        }))
      : [];

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.api.bulkUpdateSeatMapSeats(this.seatMapId(), {
      seatIds: selected.map((seat) => this.seatId(seat)),
      changes: apiChanges,
      updates: positionUpdates,
    }).subscribe({
      next: (response) => {
        const updated = new Map(response.items.map((seat) => [
          this.seatId(seat),
          this.normalizeSeat(seat),
        ]));
        this.seats.update((items) => items.map((seat) => updated.get(this.seatId(seat)) || seat));
        this.positionDirty.set(false);
        this.inspectorForm.markAsPristine();
        this.notifications.success(`${response.count} sedišta je sačuvano.`);
        this.onSelectionChange([...this.selectedIds()]);
      },
      error: (error) => {
        const details = error?.error?.details?.fields;
        this.errorMessage.set(details?.[0]?.message || error?.error?.message || 'Sedišta nisu sačuvana.');
      },
      complete: () => this.isSaving.set(false),
    });
  }

  hasUnsavedChanges(): boolean {
    return this.positionDirty() || (this.inspectorForm.dirty && this.selectedIds().length > 0);
  }

  seatId(seat: AdminSeat): string {
    return String(seat.id || seat._id || '');
  }

  idOf(value: unknown): string {
    const object = value as { _id?: string; id?: string } | null;
    return String(object?._id || object?.id || value || '');
  }

  private normalizeSeat(seat: AdminSeat): AdminSeat {
    return {
      ...seat,
      id: String(seat.id || seat._id || ''),
      baseIsSellable: seat.baseIsSellable ?? seat.isSellable,
      availabilityStatus: seat.availabilityStatus || (
        seat.isActive === false || seat.isSellable === false ? 'unavailable' : 'available'
      ),
    };
  }
}
