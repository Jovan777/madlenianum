import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { MediaUrlService } from '../../../core/services/media-url.service';

@Component({
  selector: 'app-admin-homepage-preview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-homepage-preview.component.html',
  styleUrl: './admin-homepage-preview.component.scss',
})
export class AdminHomepagePreviewComponent implements OnInit {
  private readonly cms = inject(CmsAdminService);
  private readonly route = inject(ActivatedRoute);
  readonly media = inject(MediaUrlService);
  readonly data = signal<Record<string, unknown> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    const language = this.route.snapshot.queryParamMap.get('lang') === 'en' ? 'en' : 'sr';
    this.cms.previewHomepage<Record<string, unknown>>(language).subscribe({
      next: (response) => this.data.set(response),
      error: (error) => this.error.set(error?.error?.message || 'Pregled nije dostupan.'),
      complete: () => this.loading.set(false),
    });
  }

  array(key: string): Record<string, unknown>[] {
    const value = this.data()?.[key];
    return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  }

  image(value: unknown): string {
    return this.media.resolve(value);
  }
}
