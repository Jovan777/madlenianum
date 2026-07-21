import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-external-links-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './external-links-editor.component.html',
  styleUrl: './external-links-editor.component.scss',
})
export class ExternalLinksEditorComponent {
  @Input({ required: true }) array!: FormArray;
  @Input() title = 'Spoljasnji linkovi';
  @Input() showType = false;
  @Input() linkTypes: Array<{ value: string; label: string }> = [];

  constructor(private readonly fb: FormBuilder) {}

  groups(): FormGroup[] { return this.array.controls as FormGroup[]; }
  add(value: Record<string, unknown> = {}): void {
    this.array.push(this.fb.group({
      label: [String(value['label'] || ''), Validators.required],
      url: [String(value['url'] || ''), [Validators.required, Validators.pattern(/^https?:\/\//i)]],
      type: [String(value['type'] || 'other')],
      displayOrder: [this.array.length],
    }));
    this.array.markAsDirty();
  }
  remove(index: number): void { this.array.removeAt(index); this.normalize(); }
  move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.array.length) return;
    const group = this.array.at(index);
    this.array.removeAt(index);
    this.array.insert(target, group);
    this.normalize();
  }
  private normalize(): void {
    this.array.controls.forEach((control, index) => control.get('displayOrder')?.setValue(index));
    this.array.markAsDirty();
  }
}
