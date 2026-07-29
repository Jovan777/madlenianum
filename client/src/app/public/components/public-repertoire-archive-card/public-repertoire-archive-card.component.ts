import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicProduction } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';

@Component({
  selector: 'app-public-repertoire-archive-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-repertoire-archive-card.component.html',
  styleUrl: './public-repertoire-archive-card.component.scss',
})
export class PublicRepertoireArchiveCardComponent {
  readonly production = input.required<PublicProduction>();
  readonly imageIndex = input(0);
  readonly api = inject(PublicApiService);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);

  image(): string {
    return this.api.mediaUrl(this.production().poster) || this.api.fallbackImage(this.imageIndex());
  }
}
