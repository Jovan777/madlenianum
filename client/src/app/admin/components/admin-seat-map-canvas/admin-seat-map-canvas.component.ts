import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';

import { AdminSeat } from '../../../core/models/admin.models';
import {
  effectiveSeatStateLabel,
  seatOverrideLabel,
} from '../../../core/models/cms-labels';

@Component({
  selector: 'app-admin-seat-map-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-seat-map-canvas.component.html',
  styleUrl: './admin-seat-map-canvas.component.scss',
})
export class AdminSeatMapCanvasComponent {
  @Input() seats: AdminSeat[] = [];
  @Input() canvasWidth = 1400;
  @Input() canvasHeight = 1000;
  @Input() selectedIds: string[] = [];
  @Input() visibleSection = 'all';
  @Input() readOnly = false;
  @Input() showStage = true;
  @Input() highlightOverrideType = '';
  @Output() readonly selectedIdsChange = new EventEmitter<string[]>();

  @ViewChild('viewport') private viewport?: ElementRef<HTMLDivElement>;

  readonly zoom = signal(0.75);
  readonly panX = signal(0);
  readonly panY = signal(0);

  private lastSelectedId = '';
  private isPanning = false;
  private panStart = { x: 0, y: 0, panX: 0, panY: 0 };

  visibleSeats(): AdminSeat[] {
    if (this.visibleSection === 'all') return this.seats;
    return this.seats.filter((seat) => seat.section === this.visibleSection);
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

  selectSeat(event: MouseEvent, seat: AdminSeat): void {
    event.stopPropagation();
    if (this.readOnly) return;
    const id = String(seat.id || seat._id);
    let selection = [...this.selectedIds];

    if (event.shiftKey && this.lastSelectedId) {
      const anchor = this.seats.find((item) => String(item.id || item._id) === this.lastSelectedId);
      if (anchor && anchor.section === seat.section && anchor.row === seat.row) {
        const rowSeats = this.seats
          .filter((item) => item.section === seat.section && item.row === seat.row)
          .sort((left, right) => Number(left.number || 0) - Number(right.number || 0));
        const from = rowSeats.findIndex((item) => String(item.id || item._id) === this.lastSelectedId);
        const to = rowSeats.findIndex((item) => String(item.id || item._id) === id);
        const range = rowSeats
          .slice(Math.min(from, to), Math.max(from, to) + 1)
          .map((item) => String(item.id || item._id));
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
      .map((seat) => String(seat.id || seat._id)));
  }

  selectSection(): void {
    const anchor = this.anchorSeat();
    if (!anchor || this.readOnly) return;
    this.emitSelection(this.seats
      .filter((seat) => seat.section === anchor.section)
      .map((seat) => String(seat.id || seat._id)));
  }

  selectAllVisible(): void {
    if (this.readOnly) return;
    this.emitSelection(this.visibleSeats().map((seat) => String(seat.id || seat._id)));
  }

  clearSelection(): void {
    if (this.readOnly) return;
    this.lastSelectedId = '';
    this.emitSelection([]);
  }

  zoomBy(delta: number): void {
    this.zoom.set(Math.min(2.5, Math.max(0.25, this.zoom() + delta)));
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
    this.zoom.set(Math.min(1.5, Math.max(0.25,
      Math.min(availableWidth / this.canvasWidth, availableHeight / this.canvasHeight)
    )));
    this.panX.set((element.clientWidth - this.canvasWidth * this.zoom()) / 2);
    this.panY.set(20);
  }

  resetView(): void {
    this.zoom.set(0.75);
    this.panX.set(20);
    this.panY.set(20);
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
      left: `${Number(seat.x || 0)}px`,
      top: `${Number(seat.y || 0)}px`,
      width: `${Math.max(24, Number(seat.width || 30))}px`,
      height: `${Math.max(24, Number(seat.height || 30))}px`,
      transform: `rotate(${Number(seat.rotation || 0)}deg)`,
    };
  }

  seatClass(seat: AdminSeat): Record<string, boolean> {
    const id = String(seat.id || seat._id);
    return {
      selected: this.selectedIds.includes(id),
      inactive: seat.isActive === false,
      accessible: Boolean(seat.isAccessible),
      restricted: Boolean(seat.hasRestrictedView),
      overridden: Boolean(seat.override?.active),
      dimmed: Boolean(this.highlightOverrideType)
        && seat.override?.type !== this.highlightOverrideType,
      [`state-${seat.availabilityStatus}`]: true,
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

  private anchorSeat(): AdminSeat | null {
    const id = this.lastSelectedId || this.selectedIds.at(-1) || '';
    return this.seats.find((seat) => String(seat.id || seat._id) === id) || null;
  }

  private emitSelection(selection: string[]): void {
    this.selectedIds = selection;
    this.selectedIdsChange.emit(selection);
  }
}
