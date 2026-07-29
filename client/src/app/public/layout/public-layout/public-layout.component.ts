import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PublicSiteSettings } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicMotionRootDirective } from '../../shared/public-motion-root.directive';
import { PublicFooterComponent } from '../public-footer/public-footer.component';
import { PublicHeaderComponent } from '../public-header/public-header.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, PublicHeaderComponent, PublicFooterComponent, PublicMotionRootDirective],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss',
})
export class PublicLayoutComponent {
  readonly settings = signal<PublicSiteSettings | null>(null);
  private readonly api = inject(PublicApiService);
  private readonly locale = inject(PublicLocaleService);

  constructor() {
    effect(() => {
      this.locale.locale();
      this.api.getSiteSettings().subscribe({ next: (response) => this.settings.set(response.item) });
    });
  }

}
