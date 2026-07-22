import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PublicSiteSettings } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicFooterComponent } from '../public-footer/public-footer.component';
import { PublicHeaderComponent } from '../public-header/public-header.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, PublicHeaderComponent, PublicFooterComponent],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss',
})
export class PublicLayoutComponent implements OnInit {
  readonly settings = signal<PublicSiteSettings | null>(null);
  private readonly api = inject(PublicApiService);

  ngOnInit(): void {
    this.api.getSiteSettings().subscribe({
      next: (response) => this.settings.set(response.item),
    });
  }
}
