import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

import { GalleryItemInput } from '../../../core/models/cms.models';
import { MediaSelectionResult, MediaSelectionValue } from '../../../core/models/media.models';
import { MediaPickerComponent } from '../media-picker/media-picker.component';

@Component({
  selector: 'app-structured-gallery-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPickerComponent],
  templateUrl: './structured-gallery-editor.component.html',
  styleUrl: './structured-gallery-editor.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StructuredGalleryEditorComponent), multi: true }],
})
export class StructuredGalleryEditorComponent implements ControlValueAccessor {
  @Input() label = 'Galerija';
  @Input() language: 'sr' | 'en' = 'sr';
  items: GalleryItemInput[] = [];
  disabled = false;
  private onChange: (value: GalleryItemInput[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: GalleryItemInput[] | null): void {
    this.items = (value || []).map((item, index) => ({ ...item, displayOrder: item.displayOrder ?? index }));
  }
  registerOnChange(fn: (value: GalleryItemInput[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  selectionValues(): MediaSelectionValue[] { return this.items.map((item) => item.media); }

  updateSelection(selection: MediaSelectionResult): void {
    const previous = new Map(this.items.map((item) => [this.mediaId(item.media), item]));
    const values: MediaSelectionValue[] = selection.items.length ? selection.items : selection.ids;
    this.items = values.map((media, index) => {
      const existing = previous.get(this.mediaId(media));
      return existing || {
        media,
        caption: typeof media === 'string' ? '' : media.caption || '',
        credit: typeof media === 'string' ? '' : media.credit || '',
        altText: typeof media === 'string' ? '' : media.altText || media.alt || '',
        displayOrder: index,
      };
    });
    this.emit();
  }

  update(index: number, field: 'caption' | 'credit' | 'altText', value: string): void {
    this.items = this.items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (this.language === 'sr') return { ...item, [field]: value };
      return {
        ...item,
        translations: {
          ...item.translations,
          en: { ...item.translations?.en, [field]: value },
        },
      };
    });
    this.emit();
  }

  fieldValue(item: GalleryItemInput, field: 'caption' | 'credit' | 'altText'): string {
    return this.language === 'en' ? item.translations?.en?.[field] || '' : item[field] || '';
  }

  move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.items.length) return;
    const items = [...this.items];
    [items[index], items[target]] = [items[target], items[index]];
    this.items = items;
    this.emit();
  }

  remove(index: number): void { this.items = this.items.filter((_, itemIndex) => itemIndex !== index); this.emit(); }
  mediaTitle(item: GalleryItemInput): string {
    if (typeof item.media === 'string') return 'Izabrana slika';
    return item.media.title || item.media.originalName || 'Izabrana slika';
  }

  private mediaId(value: MediaSelectionValue): string { return typeof value === 'string' ? value : String(value._id || value.id || ''); }
  private emit(): void {
    this.items = this.items.map((item, index) => ({ ...item, displayOrder: index }));
    this.onChange(this.items);
    this.onTouched();
  }
}
