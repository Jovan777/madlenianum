import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PublicGalleryItem, PublicNews } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicGalleryLightboxComponent } from '../../components/public-gallery-lightbox/public-gallery-lightbox.component';
import { PublicDisplayService } from '../../shared/public-display.service';

@Component({
  selector: 'app-public-news-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicGalleryLightboxComponent],
  templateUrl: './public-news-detail.component.html',
  styleUrl: './public-news-detail.component.scss',
})
export class PublicNewsDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly api = inject(PublicApiService);
  readonly display = inject(PublicDisplayService);
  readonly item = signal<PublicNews | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly lightbox = signal<PublicGalleryItem[] | null>(null);

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.api.getNewsItem(slug).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => this.item.set(response.item),
      error: (error) => this.error.set(error?.error?.message || 'Vest nije pronađena.'),
    });
  }

  image(value: unknown): string { return this.api.mediaUrl(value); }
  heroImage(item: PublicNews): string { return this.image(item.image) || '/madlenianum/madlenianum_zgrada.jpg'; }
  openGallery(index: number): void {
    const gallery = this.item()?.galleryItems || [];
    if (!gallery.length) return;
    this.lightbox.set([...gallery.slice(index), ...gallery.slice(0, index)]);
  }
}
