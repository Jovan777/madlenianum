import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { PublicSeat } from '../../../core/models/public.models';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';

interface MapBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

interface PublicMapGroup {
  key: string;
  label: string;
  sections: string[];
}

interface PublicRowGuide {
  label: string;
  top: number;
  left: number;
  right: number;
}

interface PublicCategoryLegend {
  key: string;
  label: string;
  amount: number | null;
  currency: string;
  shape: 'square' | 'circle';
}

@Component({
  selector: 'app-public-seat-map',
  standalone: true,
  imports: [CommonModule, PublicTranslatePipe],
  templateUrl: './public-seat-map.component.html',
  styleUrl: './public-seat-map.component.scss',
})
export class PublicSeatMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  readonly i18n = inject(PublicI18nService);

  @Input() seats: PublicSeat[] = [];
  @Input() selectedSeatIds: string[] = [];
  @Input() lockedSeatIds: string[] = [];
  @Input() canvasWidth = 1000;
  @Input() canvasHeight = 850;
  @Input() disabled = false;
  @Input() maxSelection = 4;
  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() selectionError = new EventEmitter<string>();

  @ViewChild('viewport') viewport?: ElementRef<HTMLElement>;

  readonly activeSection = signal('parter');
  readonly fitScale = signal(1);
  readonly zoomFactor = signal(1);

  private resizeObserver?: ResizeObserver;
  private bounds: MapBounds = { minX: 0, minY: 0, width: 1000, height: 850 };

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(() => this.updateFitScale());
    this.resizeObserver.observe(this.viewport!.nativeElement);
    queueMicrotask(() => this.updateFitScale());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['seats'] || changes['canvasWidth'] || changes['canvasHeight']) {
      const groups = this.mapGroups();
      if (groups.length && !groups.some((group) => group.key === this.activeSection())) {
        this.activeSection.set(groups[0].key);
      }
      this.updateBounds();
      queueMicrotask(() => this.updateFitScale());
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  mapGroups(): PublicMapGroup[] {
    const sections = [...new Set(this.seats.map((seat) => seat.section || 'Ostalo'))];
    const parterSections = sections.filter((section) =>
      section.toLocaleLowerCase('sr-RS').includes('parter')
    );
    const gallerySections = sections.filter((section) => {
      const normalized = section.toLocaleLowerCase('sr-RS');
      return normalized.includes('galerija') || normalized.includes('centralna');
    });
    const assigned = new Set([...parterSections, ...gallerySections]);
    const groups: PublicMapGroup[] = [];

    if (parterSections.length) {
      groups.push({ key: 'parter', label: 'Parter', sections: parterSections });
    }
    if (gallerySections.length) {
      groups.push({ key: 'galerija', label: 'Galerija', sections: gallerySections });
    }
    sections
      .filter((section) => !assigned.has(section))
      .forEach((section) => {
        groups.push({
          key: `section-${section}`,
          label: this.formatSectionLabel(section),
          sections: [section],
        });
      });

    return groups;
  }

  visibleSeats(): PublicSeat[] {
    const group = this.mapGroups().find((item) => item.key === this.activeSection());
    if (!group) return this.seats;
    const includedSections = new Set(group.sections);
    return this.seats.filter((seat) => includedSections.has(seat.section || 'Ostalo'));
  }

  rowGuides(): PublicRowGuide[] {
    if (this.activeSection() !== 'parter') return [];

    const rows = new Map<string, PublicSeat[]>();
    this.visibleSeats()
      .filter((seat) => seat.section === 'Parter' && Boolean(seat.row))
      .forEach((seat) => {
        const current = rows.get(String(seat.row)) || [];
        current.push(seat);
        rows.set(String(seat.row), current);
      });

    return [...rows.entries()]
      .map(([label, seats]) => {
        const xValues = seats.map((seat) => this.seatLeft(seat));
        const top = seats.reduce((sum, seat) => sum + this.seatTop(seat), 0) / seats.length;
        return {
          label,
          top,
          left: Math.max(8, Math.min(...xValues) - 38),
          right: Math.min(this.mapWidth() - 8, Math.max(...xValues) + 38),
        };
      })
      .sort((a, b) => a.top - b.top);
  }

  categoryLegend(): PublicCategoryLegend[] {
    const byCategory = new Map<string, PublicCategoryLegend>();

    this.visibleSeats().forEach((seat) => {
      const code = String(seat.priceCategory?.code || '').trim().toUpperCase();
      const isAuxiliary = seat.seatType === 'auxiliary' || code === 'III';
      const key = isAuxiliary ? 'III' : code || String(seat.priceCategory?.id || 'seat');
      if (byCategory.has(key)) return;

      byCategory.set(key, {
        key,
        label: seat.priceCategory?.name || this.i18n.t('ticketing.ticket'),
        amount: seat.price ? Number(seat.price.amount) : null,
        currency: seat.price?.currency || 'RSD',
        shape: isAuxiliary ? 'circle' : 'square',
      });
    });

    const order = new Map([['I', 1], ['II', 2], ['III', 3], ['ALL', 4]]);
    return [...byCategory.values()].sort(
      (a, b) => (order.get(a.key) || 10) - (order.get(b.key) || 10)
    );
  }

  setSection(section: string): void {
    this.activeSection.set(section);
    this.zoomFactor.set(1);
    this.updateBounds();
    queueMicrotask(() => this.updateFitScale());
  }

  zoomIn(): void {
    this.zoomFactor.update((value) => Math.min(1.25, Number((value + 0.1).toFixed(2))));
  }

  zoomOut(): void {
    this.zoomFactor.update((value) => Math.max(0.85, Number((value - 0.1).toFixed(2))));
  }

  resetZoom(): void {
    this.zoomFactor.set(1);
  }

  scale(): number {
    return this.fitScale() * this.zoomFactor();
  }

  scaledWidth(): number {
    return Math.max(1, this.mapWidth() * this.scale());
  }

  scaledHeight(): number {
    return Math.max(1, this.mapHeight() * this.scale());
  }

  toggleSeat(seat: PublicSeat): void {
    if (this.disabled || !this.canSelect(seat)) return;

    const id = String(seat.id);
    if (this.selectedSeatIds.includes(id)) {
      this.selectionChange.emit(this.selectedSeatIds.filter((item) => item !== id));
      return;
    }

    if (this.selectedSeatIds.length >= this.maxSelection) {
      this.selectionError.emit(`Maksimalan broj ulaznica je ${this.maxSelection}.`);
      return;
    }

    this.selectionChange.emit([...this.selectedSeatIds, id]);
  }

  seatClass(seat: PublicSeat): string[] {
    const code = String(seat.priceCategory?.code || '').trim().toLowerCase();
    const classes = [
      `status-${seat.availabilityStatus}`,
      `category-${code || 'default'}`,
      `seat-type-${seat.seatType || 'standard'}`,
    ];
    if (this.selectedSeatIds.includes(String(seat.id))) classes.push('selected');
    if (this.lockedSeatIds.includes(String(seat.id))) classes.push('own-lock');
    if (seat.isAccessible) classes.push('accessible');
    return classes;
  }

  seatTitle(seat: PublicSeat): string {
    const price = seat.price
      ? `${seat.price.amount.toLocaleString('sr-RS')} ${seat.price.currency}`
      : 'Bez cene';
    const location = [
      seat.section,
      seat.row ? `red ${seat.row}` : '',
      seat.number ? `sedište ${seat.number}` : '',
    ].filter(Boolean).join(', ');
    return `${location || seat.label}, ${this.statusLabel(seat.availabilityStatus)}, ${price}`;
  }

  seatWidth(seat: PublicSeat): number {
    return Math.max(18, Math.min(24, Number(seat.width || 22)));
  }

  seatHeight(seat: PublicSeat): number {
    return Math.max(18, Math.min(24, Number(seat.height || 22)));
  }

  seatLeft(seat: PublicSeat): number {
    return Number(seat.x || 0) - this.bounds.minX;
  }

  seatTop(seat: PublicSeat): number {
    return Number(seat.y || 0) - this.bounds.minY;
  }

  mapWidth(): number {
    return this.bounds.width;
  }

  mapHeight(): number {
    return this.bounds.height;
  }

  formatSectionLabel(section: string): string {
    return section
      .toLocaleLowerCase('sr-RS')
      .replace(/(^|\s)\S/g, (value) => value.toLocaleUpperCase('sr-RS'));
  }

  canSelect(seat: PublicSeat): boolean {
    return seat.availabilityStatus === 'available' && seat.isSellable !== false;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      available: this.i18n.t('ticketing.available'),
      selected: this.i18n.t('ticketing.selected'),
      locked: this.i18n.t('ticketing.locked'),
      reserved: this.i18n.t('ticketing.reserved'),
      sold: this.i18n.t('ticketing.sold'),
      box_office_only: this.i18n.t('ticketing.boxOfficeOnly'),
      unavailable: this.i18n.t('ticketing.unavailable'),
    };
    return labels[status] || status;
  }

  trackSeat(_index: number, seat: PublicSeat): string {
    return String(seat.id);
  }

  private updateFitScale(): void {
    const viewport = this.viewport?.nativeElement;
    if (!viewport) return;

    const availableWidth = Math.max(280, viewport.clientWidth - 36);
    const scaleCap = this.activeSection() === 'parter' ? 1.75 : 1.2;
    const nextScale = Math.min(
      availableWidth / Math.max(1, this.mapWidth()),
      scaleCap
    );
    this.fitScale.set(Math.max(0.34, nextScale));
  }

  private updateBounds(): void {
    const visible = this.visibleSeats();
    if (visible.length === 0) {
      this.bounds = { minX: 0, minY: 0, width: this.canvasWidth, height: this.canvasHeight };
      return;
    }

    const maxX = Math.max(...visible.map((seat) => Number(seat.x || 0))) + 55;
    const maxY = Math.max(...visible.map((seat) => Number(seat.y || 0))) + 46;
    const isParter = this.activeSection() === 'parter';
    this.bounds = {
      minX: 0,
      minY: 0,
      width: isParter
        ? Math.max(960, maxX)
        : Math.max(700, this.canvasWidth, maxX),
      height: isParter
        ? Math.max(820, maxY)
        : Math.max(500, this.canvasHeight, maxY),
    };
  }
}
