import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PublicProduction } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicDisplayService, RepertoireGroup } from '../../shared/public-display.service';

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
  private readonly display = inject(PublicDisplayService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly productions = signal<PublicProduction[]>([]);
  readonly activeType = signal('all');
  readonly activeGroup = signal<RepertoireGroup>('all');

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.activeType.set(params.get('type') || 'all');
      const group = params.get('group');
      this.activeGroup.set(
        ['dramski', 'muzicki', 'gostovanja'].includes(group || '')
          ? group as RepertoireGroup
          : 'all'
      );
    });

    this.publicApi.getProductions().subscribe({
      next: (response) => {
        this.productions.set(this.publicApi.extractItems<PublicProduction>(response, ['productions', 'items']));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Predstave trenutno nisu dostupne.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  types(): string[] {
    const values = this.productions()
      .map((production) => production.type || '')
      .filter(Boolean);

    return ['all', ...Array.from(new Set(values))];
  }

  filteredProductions(): PublicProduction[] {
    const type = this.activeType();
    const group = this.activeGroup();

    if (group !== 'all') {
      return this.productions().filter((production) => this.display.productionGroup(production) === group);
    }

    if (type === 'all') {
      return this.productions();
    }

    return this.productions().filter((production) => production.type === type);
  }

  image(production: PublicProduction, index: number): string {
    return this.publicApi.mediaUrl(production.poster) || this.publicApi.fallbackImage(index);
  }

  typeLabel(type: string | undefined): string {
    return this.publicApi.typeLabel(type);
  }

  filterLabel(type: string): string {
    return type === 'all' ? 'Sve' : this.publicApi.typeLabel(type);
  }

  description(production: PublicProduction): string {
    return production.shortDescription || production.subtitle || production.authorComposer || 'Detalji predstave.';
  }
}
