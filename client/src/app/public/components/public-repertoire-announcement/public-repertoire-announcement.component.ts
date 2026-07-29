import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicProduction, PublicVideo } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';
import { PublicDisplayService } from '../../shared/public-display.service';
import { PublicVideoModalComponent } from '../public-video-modal/public-video-modal.component';

@Component({
  selector: 'app-public-repertoire-announcement',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicVideoModalComponent, PublicTranslatePipe],
  templateUrl: './public-repertoire-announcement.component.html',
  styleUrl: './public-repertoire-announcement.component.scss',
})
export class PublicRepertoireAnnouncementComponent {
  readonly production = input.required<PublicProduction>();
  readonly imageIndex = input(0);
  readonly alignRight = input(false);
  readonly activeVideo = signal<PublicVideo | null>(null);

  readonly api = inject(PublicApiService);
  readonly display = inject(PublicDisplayService);
  readonly locale = inject(PublicLocaleService);

  readonly trailer = computed(() => {
    const production = this.production();
    return production.trailer || production.videos?.find((video) => video.isTrailer) || production.videos?.[0] || null;
  });

  image(): string {
    const production = this.production();
    return this.api.mediaUrl(production.announcement?.image || production.poster)
      || this.api.fallbackImage(this.imageIndex());
  }

  period(): string {
    const announcement = this.production().announcement;
    if (!announcement?.month || !announcement.year) return this.locale.isEnglish() ? 'COMING SOON' : 'USKORO';

    return new Intl.DateTimeFormat(this.locale.isEnglish() ? 'en-GB' : 'sr-Latn-RS', {
      month: 'long',
      year: 'numeric',
      timeZone: this.display.timeZone,
    }).format(new Date(announcement.year, announcement.month - 1, 1)).toUpperCase();
  }
}
