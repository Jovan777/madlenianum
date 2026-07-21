import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-tag-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tag-editor.component.html',
  styleUrl: './tag-editor.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TagEditorComponent), multi: true }],
})
export class TagEditorComponent implements ControlValueAccessor {
  @Input() label = 'Oznake';
  @Input() placeholder = 'Unesite oznaku';
  values: string[] = [];
  draft = '';
  disabled = false;
  private onChange: (value: string[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string[] | null): void { this.values = Array.isArray(value) ? [...value] : []; }
  registerOnChange(fn: (value: string[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  add(): void {
    const value = this.draft.trim();
    if (value && !this.values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      this.values = [...this.values, value];
      this.onChange(this.values);
    }
    this.draft = '';
    this.onTouched();
  }

  remove(index: number): void {
    this.values = this.values.filter((_, itemIndex) => itemIndex !== index);
    this.onChange(this.values);
    this.onTouched();
  }
}
