import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicHomepageConfig } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';
import { isAvailablePublicDestination } from '../../shared/public-navigation';

type InstitutionalTeaser = PublicHomepageConfig['institutionalTeaser'];

@Component({
  selector: 'app-public-institutional-teaser',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicTranslatePipe],
  templateUrl: './public-institutional-teaser.component.html',
  styleUrl: './public-institutional-teaser.component.scss',
})
export class PublicInstitutionalTeaserComponent {
  readonly teaser = input.required<InstitutionalTeaser>();
  readonly media = inject(MediaUrlService);
  readonly locale = inject(PublicLocaleService);

  destination(): string {
    const value = this.teaser().ctaUrl || '/strana/o-nama';
    const safeValue = isAvailablePublicDestination(value) ? value : '/strana/o-nama';
    return this.locale.equivalentPath(safeValue, this.locale.current());
  }
}
