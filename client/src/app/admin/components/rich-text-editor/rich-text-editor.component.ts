import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RichTextEditorComponent), multi: true }],
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit {
  @Input() label = 'Sadrzaj';
  @Input() help = 'Koristite osnovno formatiranje za duzi urednicki tekst.';
  @ViewChild('editor') editor?: ElementRef<HTMLDivElement>;

  value = '';
  disabled = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngAfterViewInit(): void {
    this.renderValue();
  }

  writeValue(value: string | null): void {
    this.value = value || '';
    this.renderValue();
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  format(command: string, value?: string): void {
    this.editor?.nativeElement.focus();
    document.execCommand(command, false, value);
    this.capture();
  }

  addLink(): void {
    const url = window.prompt('Unesite HTTP/HTTPS adresu linka:');
    if (url) this.format('createLink', url);
  }

  capture(): void {
    this.value = this.editor?.nativeElement.innerHTML || '';
    this.onChange(this.value);
  }

  touch(): void { this.onTouched(); }

  private renderValue(): void {
    if (this.editor && this.editor.nativeElement.innerHTML !== this.value) {
      this.editor.nativeElement.innerHTML = this.value;
    }
  }
}
