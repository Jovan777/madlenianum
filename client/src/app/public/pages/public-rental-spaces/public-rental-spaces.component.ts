import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { RentalSpace } from '../../../core/models/phase6a.models';
import { PublicSiteSettings } from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicEventPlanningFormComponent } from '../../components/public-event-planning-form/public-event-planning-form.component';
import { rentalSpaceImage } from '../../shared/rental-space-presentation';

@Component({
  selector: 'app-public-rental-spaces',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicEventPlanningFormComponent],
  templateUrl: './public-rental-spaces.component.html',
  styleUrl: './public-rental-spaces.component.scss',
})
export class PublicRentalSpacesComponent implements OnInit {
  private readonly api = inject(PublicApiService);

  readonly spaces = signal<RentalSpace[]>([]);
  readonly settings = signal<PublicSiteSettings | null>(null);
  readonly selectedSpaceId = signal('');
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    forkJoin({
      spaces: this.api.getRentalSpaces({ limit: 30, sort: 'display' }),
      settings: this.api.getSiteSettings(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.spaces.set(response.spaces.items);
          this.settings.set(response.settings.item);
        },
        error: (error) => {
          this.error.set(
            error?.error?.message || 'Prostori za zakup trenutno nisu dostupni.'
          );
        },
      });
  }

  image(space: RentalSpace): string {
    return rentalSpaceImage(space.slug, this.api.mediaUrl(space.heroImage));
  }

  facts(space: RentalSpace): string[] {
    const values: string[] = [];

    if (space.seatedCapacity) {
      values.push(`${space.seatedCapacity} sedećih`);
    }
    if (space.standingCapacity) {
      values.push(`${space.standingCapacity} gostiju`);
    }
    if (space.areaSqm) {
      values.push(`${space.areaSqm} m²`);
    }

    values.push(...space.amenities, ...space.technicalEquipment);
    return values.slice(0, 5);
  }

  scrollToPlanning(space?: RentalSpace): void {
    if (space) {
      this.selectedSpaceId.set(space.id);
    }

    window.setTimeout(() => {
      document.getElementById('planiranje')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }
}
