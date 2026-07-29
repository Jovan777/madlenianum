import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CmsOption } from '../../../core/models/cms.models';
import { SearchPickerComponent } from '../search-picker/search-picker.component';

@Component({ selector: 'app-creative-team-editor', standalone: true, imports: [CommonModule, ReactiveFormsModule, SearchPickerComponent], templateUrl: './creative-team-editor.component.html', styleUrl: './creative-team-editor.component.scss' })
export class CreativeTeamEditorComponent {
  @Input({ required: true }) array!: FormArray;
  @Input() artists: CmsOption[] = [];
  @Input() roles: Array<{ value: string; label: string }> = [];
  @Input() language: 'sr' | 'en' = 'sr';
  constructor(private readonly fb: FormBuilder) {}
  groups(): FormGroup[] { return this.array.controls as FormGroup[]; }
  add(value: Record<string, unknown> = {}): void {
    this.array.push(this.fb.group({
      roleKey: [String(value['roleKey'] || 'other')],
      label: [String(value['label'] || value['role'] || ''), Validators.required],
      artist: [String(value['artist'] || '')],
      name: [String(value['name'] || '')],
      note: [String(value['note'] || '')],
      translations: this.fb.group({ en: this.fb.group({ label: [''], name: [''], note: [''] }) }),
      displayOrder: [this.array.length],
    }));
    this.array.markAsDirty();
  }
  remove(index: number): void { this.array.removeAt(index); this.normalize(); }
  move(index: number, direction: -1 | 1): void { const target = index + direction; if (target < 0 || target >= this.array.length) return; const item = this.array.at(index); this.array.removeAt(index); this.array.insert(target, item); this.normalize(); }
  missingPerson(group: FormGroup): boolean { return Boolean(group.touched && !group.get('artist')?.value && !String(group.get('name')?.value || '').trim()); }
  private normalize(): void { this.array.controls.forEach((item, index) => item.get('displayOrder')?.setValue(index)); this.array.markAsDirty(); }
}
