import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicHomepageConfig } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { isAvailablePublicDestination } from '../../shared/public-navigation';

type InstitutionalTeaser = PublicHomepageConfig['institutionalTeaser'];

@Component({
  selector: 'app-public-institutional-teaser',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-institutional-teaser.component.html',
  styleUrl: './public-institutional-teaser.component.scss',
})
export class PublicInstitutionalTeaserComponent {
  readonly teaser = input.required<InstitutionalTeaser>();
  readonly media = inject(MediaUrlService);

  destination(): string {
    const value = this.teaser().ctaUrl || '/strana/o-nama';
    return isAvailablePublicDestination(value) ? value : '/strana/o-nama';
  }
}
