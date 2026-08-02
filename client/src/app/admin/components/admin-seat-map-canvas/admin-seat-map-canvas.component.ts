import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';

import { AdminSeat } from '../../../core/models/admin.models';
import {
  effectiveSeatStateLabel,
  seatOverrideLabel,
} from '../../../core/models/cms-labels';
import {
  SeatMapLayoutBounds,
  SeatMapLayoutGroup,
  SeatMapRowGuide,
  buildSeatMapGroups,
  buildSeatMapRowGuides,
  calculateSeatMapBounds,
  seatMapGroupForSection,
  seatMapSeatHeight,
  seatMapSeatWidth,
  seatsForSeatMapGroup,
} from '../../../core/utils/seat-map-layout';

@Component({
  selector: 'app-admin-seat-map-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-seat-map-canvas.component.html',
  styleUrl: './admin-seat-map-canvas.component.scss',
})
export class AdminSeatMapCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() seats: AdminSeat[] = [];
  @Input() canvasWidth = 1400;
  @Input() canvasHeight = 1000;
  @Input() selectedIds: string[] = [];
  @Input() visibleSection = 'all';
  @Input() readOnly = false;
  @Input() showStage = true;
  @Input() highlightOverrideType = '';
  @Output() readonly selectedIdsChange = new EventEmitter<string[]>();
  @Output() readonly visibleSectionChange = new EventEmitter<string>();

  @ViewChild('viewport') private viewport?: ElementRef<HTMLDivElement>;

  readonly activeGroup = signal('parter');
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);

  private bounds: SeatMapLayoutBounds = { minX: 0, minY: 0, width: 1000, height: 850 };
  private resizeObserver?: ResizeObserver;
  private lastSelectedId = '';
  private isPanning = false;
  private panStart = { x: 0, y: 0, panX: 0, panY: 0 };

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(() => this.fitToScreen());
    this.resizeObserver.observe(this.viewport!.nativeElement);
    queueMicrotask(() => this.fitToScreen());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['seats'] || changes['canvasWidth'] || changes['canvasHeight'] || changes['visibleSection']) {
      this.syncActiveGroup();
      this.updateBounds();
      queueMicrotask(() => this.fitToScreen());
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  mapGroups(): SeatMapLayoutGroup[] {
    return buildSeatMapGroups(this.seats);
  }

  currentGroup(): SeatMapLayoutGroup | undefined {
    return this.mapGroups().find((group) => group.key === this.activeGroup());
  }

  layoutSeats(): AdminSeat[] {
    return seatsForSeatMapGroup(this.seats, this.currentGroup());
  }

  visibleSeats(): AdminSeat[] {
    const groupedSeats = this.layoutSeats();
    if (this.visibleSection === 'all') return groupedSeats;
    return groupedSeats.filter((seat) => seat.section === this.visibleSection);
  }

  rowGuides(): SeatMapRowGuide[] {
    return buildSeatMapRowGuides(this.visibleSeats(), this.bounds, this.activeGroup());
  }

  setGroup(groupKey: string): void {
    if (this.activeGroup() === groupKey && this.visibleSection === 'all') return;
    this.activeGroup.set(groupKey);
    if (this.visibleSection !== 'all') {
      this.visibleSection = 'all';
      this.visibleSectionChange.emit('all');
    }
    if (!this.readOnly) this.clearSelection();
    this.updateBounds();
    queueMicrotask(() => this.fitToScreen());
  }

  selectionCount(): number {
    return this.selectedIds.length;
  }

  zoomPercent(): number {
    return Math.round(this.zoom() * 100);
  }

  transform(): string {
    return `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`;
  }

  mapWidth(): number {
    return this.bounds.width;
  }

  mapHeight(): number {
    return this.bounds.height;
  }

  showCanonicalStage(): boolean {
    return this.showStage && this.activeGroup() === 'parter';
  }

  selectSeat(event: MouseEvent, seat: AdminSeat): void {
    event.stopPropagation();
    if (this.readOnly) return;
    const id = this.seatId(seat);
    let selection = [...this.selectedIds];

    if (event.shiftKey && this.lastSelectedId) {
      const anchor = this.seats.find((item) => this.seatId(item) === this.lastSelectedId);
      if (anchor && anchor.section === seat.section && anchor.row === seat.row) {
        const rowSeats = this.seats
          .filter((item) => item.section === seat.section && item.row === seat.row)
          .sort((left, right) => Number(left.number || 0) - Number(right.number || 0));
        const from = rowSeats.findIndex((item) => this.seatId(item) === this.lastSelectedId);
        const to = rowSeats.findIndex((item) => this.seatId(item) === id);
        const range = rowSeats
          .slice(Math.min(from, to), Math.max(from, to) + 1)
          .map((item) => this.seatId(item));
        selection = [...new Set([...selection, ...range])];
      }
    } else if (event.ctrlKey || event.metaKey) {
      selection = selection.includes(id)
        ? selection.filter((item) => item !== id)
        : [...selection, id];
    } else {
      selection = [id];
    }

    this.lastSelectedId = id;
    this.emitSelection(selection);
  }

  selectRow(): void {
    const anchor = this.anchorSeat();
    if (!anchor || this.readOnly) return;
    this.emitSelection(this.seats
      .filter((seat) => seat.section === anchor.section && seat.row === anchor.row)
      .map((seat) => this.seatId(seat)));
  }

  selectSection(): void {
    const anchor = this.anchorSeat();
    if (!anchor || this.readOnly) return;
    this.emitSelection(this.seats
      .filter((seat) => seat.section === anchor.section)
      .map((seat) => this.seatId(seat)));
  }

  selectAllVisible(): void {
    if (this.readOnly) return;
    this.emitSelection(this.visibleSeats().map((seat) => this.seatId(seat)));
  }

  clearSelection(): void {
    if (this.readOnly) return;
    this.lastSelectedId = '';
    this.emitSelection([]);
  }

  zoomBy(delta: number): void {
    this.zoom.set(Math.min(2.5, Math.max(0.25, Number((this.zoom() + delta).toFixed(2)))));
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoomBy(event.deltaY < 0 ? 0.1 : -0.1);
  }

  fitToScreen(): void {
    const element = this.viewport?.nativeElement;
    if (!element) return;
    const availableWidth = Math.max(element.clientWidth - 48, 200);
    const availableHeight = Math.max(element.clientHeight - 48, 200);
    const nextZoom = Math.min(1.5, Math.max(
      0.25,
      Math.min(availableWidth / this.mapWidth(), availableHeight / this.mapHeight())
    ));
    this.zoom.set(nextZoom);
    this.panX.set((element.clientWidth - this.mapWidth() * nextZoom) / 2);
    this.panY.set(Math.max(20, (element.clientHeight - this.mapHeight() * nextZoom) / 2));
  }

  resetView(): void {
    this.fitToScreen();
  }

  startPan(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('.seat-button')) return;
    this.isPanning = true;
    this.panStart = {
      x: event.clientX,
      y: event.clientY,
      panX: this.panX(),
      panY: this.panY(),
    };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  movePan(event: PointerEvent): void {
    if (!this.isPanning) return;
    this.panX.set(this.panStart.panX + event.clientX - this.panStart.x);
    this.panY.set(this.panStart.panY + event.clientY - this.panStart.y);
  }

  @HostListener('document:pointerup')
  stopPan(): void {
    this.isPanning = false;
  }

  @HostListener('document:keydown.escape')
  escape(): void {
    this.clearSelection();
  }

  seatStyle(seat: AdminSeat): Record<string, string> {
    return {
      left: `${Number(seat.x || 0) - this.bounds.minX}px`,
      top: `${Number(seat.y || 0) - this.bounds.minY}px`,
      width: `${seatMapSeatWidth(seat)}px`,
      height: `${seatMapSeatHeight(seat)}px`,
      transform: `translate(-50%, -50%) rotate(${Number(seat.rotation || 0)}deg)`,
    };
  }

  seatClass(seat: AdminSeat): Record<string, boolean> {
    const id = this.seatId(seat);
    const category = String(seat.priceCategory?.code || '').trim().toLowerCase() || 'default';
    return {
      selected: this.selectedIds.includes(id),
      inactive: seat.isActive === false,
      accessible: Boolean(seat.isAccessible),
      restricted: Boolean(seat.hasRestrictedView),
      overridden: Boolean(seat.override?.active),
      dimmed: Boolean(this.highlightOverrideType)
        && seat.override?.type !== this.highlightOverrideType,
      [`state-${seat.availabilityStatus}`]: true,
      [`category-${category}`]: true,
      [`seat-type-${seat.seatType || 'standard'}`]: true,
      [`override-${seat.override?.type || 'none'}`]: true,
    };
  }

  seatDescription(seat: AdminSeat): string {
    const price = seat.price
      ? `${seat.price.amount.toLocaleString('sr-RS')} ${seat.price.currency}`
      : 'bez cene';
    const override = seat.override?.active ? `, ${seatOverrideLabel(seat.override.type)}` : '';
    const accessibility = seat.isAccessible ? ', pristupačno sedište' : '';
    const restricted = seat.hasRestrictedView ? ', ograničen pogled' : '';
    return `${seat.label}, ${seat.section}, red ${seat.row || '-'}, ${effectiveSeatStateLabel(seat.availabilityStatus)}${override}${accessibility}${restricted}, ${price}`;
  }

  readonly trackSeat = (_index: number, seat: AdminSeat): string =>
    String(seat.id || seat._id || '');

  seatId(seat: AdminSeat): string {
    return String(seat.id || seat._id || '');
  }

  private syncActiveGroup(): void {
    const groups = this.mapGroups();
    if (!groups.length) return;
    if (this.visibleSection !== 'all') {
      const sectionGroup = seatMapGroupForSection(groups, this.visibleSection);
      if (sectionGroup) this.activeGroup.set(sectionGroup.key);
      return;
    }
    if (!groups.some((group) => group.key === this.activeGroup())) {
      this.activeGroup.set(groups[0].key);
    }
  }

  private updateBounds(): void {
    this.bounds = calculateSeatMapBounds(
      this.layoutSeats(),
      this.activeGroup(),
      this.canvasWidth,
      this.canvasHeight
    );
  }

  private anchorSeat(): AdminSeat | null {
    const id = this.lastSelectedId || this.selectedIds.at(-1) || '';
    return this.seats.find((seat) => this.seatId(seat) === id) || null;
  }

  private emitSelection(selection: string[]): void {
    this.selectedIds = selection;
    this.selectedIdsChange.emit(selection);
  }
}
