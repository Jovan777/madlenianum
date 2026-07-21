import { CommonModule } from '@angular/common';
import { Component, computed, forwardRef, Input, signal } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

import { CmsOption } from '../../../core/models/cms.models';

@Component({
  selector: 'app-search-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-picker.component.html',
  styleUrl: './search-picker.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchPickerComponent), multi: true }],
})
export class SearchPickerComponent implements ControlValueAccessor {
  @Input() label = 'Izaberite';
  @Input() help = '';
  @Input() mode: 'single' | 'multiple' = 'single';
  @Input() set options(value: CmsOption[]) { this.optionItems.set(value || []); }

  readonly optionItems = signal<CmsOption[]>([]);
  readonly search = signal('');
  readonly open = signal(false);
  readonly selectedIds = signal<string[]>([]);
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.optionItems().filter((option) => !query || `${option.label} ${option.meta || ''}`.toLowerCase().includes(query)).slice(0, 50);
  });
  readonly selected = computed(() => this.selectedIds().map((id) => this.optionItems().find((option) => option.id === id)).filter((item): item is CmsOption => Boolean(item)));

  disabled = false;
  private onChange: (value: string | string[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | string[] | null): void {
    this.selectedIds.set(Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []);
  }
  registerOnChange(fn: (value: string | string[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  toggle(): void { if (!this.disabled) this.open.update((value) => !value); }
  choose(option: CmsOption): void {
    if (this.mode === 'single') {
      this.selectedIds.set([option.id]);
      this.open.set(false);
    } else if (!this.selectedIds().includes(option.id)) {
      this.selectedIds.update((items) => [...items, option.id]);
    }
    this.emit();
  }
  remove(id: string): void { this.selectedIds.update((items) => items.filter((item) => item !== id)); this.emit(); }
  isSelected(id: string): boolean { return this.selectedIds().includes(id); }
  private emit(): void {
    this.onChange(this.mode === 'single' ? this.selectedIds()[0] || '' : this.selectedIds());
    this.onTouched();
  }
}
