import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicProduction } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';

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

  image(): string {
    return this.api.mediaUrl(this.production().poster) || this.api.fallbackImage(this.imageIndex());
  }
}
