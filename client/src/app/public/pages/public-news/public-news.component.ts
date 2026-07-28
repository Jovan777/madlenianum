import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PublicNews } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicDisplayService } from '../../shared/public-display.service';

@Component({
  selector: 'app-public-news',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-news.component.html',
  styleUrl: './public-news.component.scss',
})
export class PublicNewsComponent implements OnInit {
  readonly api = inject(PublicApiService);
  readonly display = inject(PublicDisplayService);
  readonly items = signal<PublicNews[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.api.getNews().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => this.items.set(response.items || []),
      error: (error) => this.error.set(error?.error?.message || 'Vesti trenutno nisu dostupne.'),
    });
  }

  image(item: PublicNews): string {
    return this.api.mediaUrl(item.image);
  }
}
