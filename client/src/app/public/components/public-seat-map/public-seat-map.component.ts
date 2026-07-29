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

@Component({
  selector: 'app-public-seat-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-seat-map.component.html',
  styleUrl: './public-seat-map.component.scss',
})
export class PublicSeatMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  readonly i18n = inject(PublicI18nService);
  @Input() seats: PublicSeat[] = [];
  @Input() selectedSeatIds: string[] = [];
  @Input() lockedSeatIds: string[] = [];
  @Input() canvasWidth = 1200;
  @Input() canvasHeight = 760;
  @Input() disabled = false;
  @Input() maxSelection = 4;
  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() selectionError = new EventEmitter<string>();

  @ViewChild('viewport') viewport?: ElementRef<HTMLElement>;

  readonly activeSection = signal('parter');
  readonly fitScale = signal(1);

  readonly legend = [
    { status: 'available', label: this.i18n.t('ticketing.available') },
    { status: 'selected', label: this.i18n.t('ticketing.selected') },
    { status: 'locked', label: this.i18n.t('ticketing.locked') },
    { status: 'reserved', label: this.i18n.t('ticketing.reserved') },
    { status: 'sold', label: this.i18n.t('ticketing.sold') },
    { status: 'box_office_only', label: this.i18n.t('ticketing.boxOfficeOnly') },
    { status: 'unavailable', label: this.i18n.t('ticketing.unavailable') },
  ];

  private resizeObserver?: ResizeObserver;
  private bounds: MapBounds = { minX: 0, minY: 0, width: 900, height: 620 };

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
      return normalized.includes('galerija') || normalized.includes('centralna loža');
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

  setSection(section: string): void {
    this.activeSection.set(section);
    this.updateBounds();
    queueMicrotask(() => this.updateFitScale());
  }

  scale(): number {
    return this.fitScale();
  }

  scaledWidth(): number {
    return Math.max(1, this.mapWidth() * this.scale());
  }

  scaledHeight(): number {
    return Math.max(1, this.mapHeight() * this.scale());
  }

  private updateFitScale(): void {
    const viewport = this.viewport?.nativeElement;
    if (!viewport) return;

    const availableWidth = Math.max(280, viewport.clientWidth - 24);
    const availableHeight = Math.max(320, viewport.clientHeight - 24);
    const nextScale = Math.min(
      availableWidth / Math.max(1, this.mapWidth()),
      availableHeight / Math.max(1, this.mapHeight()),
      1.4
    );

    this.fitScale.set(Math.max(0.2, nextScale));
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
    const classes = [`status-${seat.availabilityStatus}`];
    if (this.selectedSeatIds.includes(String(seat.id))) classes.push('selected');
    if (this.lockedSeatIds.includes(String(seat.id))) classes.push('own-lock');
    if (seat.isAccessible) classes.push('accessible');
    return classes;
  }

  seatTitle(seat: PublicSeat): string {
    const price = seat.price
      ? `${seat.price.amount.toLocaleString('sr-RS')} ${seat.price.currency}`
      : 'Bez cene';
    return `${seat.label}, ${this.statusLabel(seat.availabilityStatus)}, ${price}`;
  }

  seatWidth(seat: PublicSeat): number {
    return Math.max(32, Math.min(34, Number(seat.width || 32)));
  }

  seatHeight(seat: PublicSeat): number {
    return Math.max(30, Math.min(32, Number(seat.height || 30)));
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
    return this.legend.find((item) => item.status === status)?.label || status;
  }

  private updateBounds(): void {
    const visible = this.visibleSeats();
    if (visible.length === 0) {
      this.bounds = { minX: 0, minY: 0, width: this.canvasWidth, height: this.canvasHeight };
      return;
    }

    const xValues = visible.map((seat) => Number(seat.x || 0));
    const yValues = visible.map((seat) => Number(seat.y || 0));
    const minX = Math.max(0, Math.min(...xValues) - 22);
    const minY = Math.max(0, Math.min(...yValues) - 145);
    const maxX = Math.max(...xValues) + 22;
    const maxY = Math.max(...yValues) + 65;

    this.bounds = {
      minX,
      minY,
      width: Math.max(640, maxX - minX),
      height: Math.max(460, maxY - minY),
    };
  }
}
