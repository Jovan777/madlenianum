import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { TagEditorComponent } from '../tag-editor/tag-editor.component';

@Component({
  selector: 'app-seo-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TagEditorComponent],
  templateUrl: './seo-fields.component.html',
  styleUrl: './seo-fields.component.scss',
})
export class SeoFieldsComponent {
  @Input({ required: true }) group!: FormGroup;
}
