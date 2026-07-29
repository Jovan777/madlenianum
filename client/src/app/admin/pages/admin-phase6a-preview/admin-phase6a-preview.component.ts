import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { CostumeItem, PropScenographyItem, RentalSpace } from '../../../core/models/phase6a.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { Phase6AAdminService } from '../../../core/services/phase6a-admin.service';
@Component({
  selector: 'app-admin-phase6a-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-phase6a-preview.component.html',
  styleUrl: './admin-phase6a-preview.component.scss',
})
export class AdminPhase6APreviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(Phase6AAdminService);
  readonly media = inject(MediaUrlService);
  readonly item = signal<CostumeItem | PropScenographyItem | RentalSpace | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '',
      type = this.route.snapshot.data['previewType'],
      kind = this.route.snapshot.paramMap.get('kind'),
      locale = this.route.snapshot.queryParamMap.get('lang') === 'en' ? 'en' : 'sr';
    const resource =
      type === 'rental-space'
        ? 'rental-spaces'
        : kind === 'props'
          ? 'fundus/props-scenography'
          : 'fundus/costumes';
    this.api
      .preview<CostumeItem | PropScenographyItem | RentalSpace>(resource, id, locale)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.item.set(r.item),
        error: (e) => this.error.set(e?.error?.message || 'Pregled nije dostupan.'),
      });
  }
  image(item: CostumeItem | PropScenographyItem | RentalSpace): string {
    return this.media.resolve(this.isRentalSpace(item) ? item.heroImage : item.mainImage);
  }
  shortDescription(item: CostumeItem | PropScenographyItem | RentalSpace): string {
    return 'shortDescription' in item ? item.shortDescription : '';
  }
  private isRentalSpace(
    item: CostumeItem | PropScenographyItem | RentalSpace,
  ): item is RentalSpace {
    return 'heroImage' in item;
  }
}
