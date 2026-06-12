import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PublicProduction } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';

@Component({
  selector: 'app-public-productions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-productions.component.html',
  styleUrl: './public-productions.component.scss',
})
export class PublicProductionsComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly productions = signal<PublicProduction[]>([]);
  readonly activeType = signal('all');

  readonly types = [
    { value: 'all', label: 'Sve' },
    { value: 'opera', label: 'Opera' },
    { value: 'opereta', label: 'Opereta' },
    { value: 'balet', label: 'Balet' },
    { value: 'drama', label: 'Drama' },
    { value: 'mjuzikl', label: 'Mjuzikl' },
    { value: 'koncert', label: 'Koncerti' },
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.activeType.set(params.get('type') || 'all');
    });

    this.publicApi.getProductions().subscribe({
      next: (response) => {
        this.productions.set(this.publicApi.extractItems<PublicProduction>(response, ['productions']));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Predstave trenutno nisu dostupne.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  filteredProductions(): PublicProduction[] {
    const type = this.activeType();

    if (type === 'all') {
      return this.productions();
    }

    return this.productions().filter((production) => production.type === type);
  }

  image(production: PublicProduction): string {
    return this.publicApi.mediaUrl(production.poster);
  }
}
