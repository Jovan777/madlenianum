import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { contentStatusLabel } from '../../../core/models/cms-labels';
import { CmsListItem } from '../../../core/models/cms.models';
import { CmsAdminService } from '../../../core/services/cms-admin.service';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { MediaUrlService } from '../../../core/services/media-url.service';

@Component({
  selector: 'app-admin-promo-slide-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-promo-slide-list.component.html',
  styleUrl: './admin-promo-slide-list.component.scss',
})
export class AdminPromoSlideListComponent implements OnInit {
  private readonly cms = inject(CmsAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(AdminNotificationService);
  readonly media = inject(MediaUrlService);
  readonly items = signal<CmsListItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  q = '';
  status = '';
  language = '';

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    this.q = query.get('q') || '';
    this.status = query.get('status') || '';
    this.language = query.get('language') || '';
    this.load();
  }

  load(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { q: this.q || null, status: this.status || null, language: this.language || null }, replaceUrl: true });
    this.loading.set(true);
    this.error.set('');
    this.cms.list<CmsListItem>('promo-slides', { q: this.q, status: this.status, language: this.language, limit: 100 }).subscribe({
      next: (response) => { this.items.set(response.items); this.total.set(response.pagination.total); },
      error: (error) => this.error.set(error?.error?.message || 'Promo slajdovi nisu ucitani.'),
      complete: () => this.loading.set(false),
    });
  }

  archive(item: CmsListItem): void {
    const id = this.id(item);
    if (!id || !window.confirm(`Arhivirati slajd "${item.title}"?`)) return;
    this.cms.archive('promo-slides', id).subscribe({
      next: () => { this.notifications.success('Promo slajd je arhiviran.'); this.load(); },
      error: (error) => this.notifications.error(error?.error?.message || 'Arhiviranje nije uspelo.'),
    });
  }

  id(item: CmsListItem): string { return String(item._id || item.id || ''); }
  image(item: CmsListItem): string { return this.media.resolve(item.image); }
  statusLabel(value: string | undefined): string { return contentStatusLabel(value); }
}
