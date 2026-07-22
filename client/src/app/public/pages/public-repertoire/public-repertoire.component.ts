import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

import {
  PublicEvent,
  PublicProduction,
  PublicRepertoireResponse,
} from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicRepertoireAnnouncementComponent } from '../../components/public-repertoire-announcement/public-repertoire-announcement.component';
import { PublicRepertoireArchiveCardComponent } from '../../components/public-repertoire-archive-card/public-repertoire-archive-card.component';
import { PublicRepertoireEventCardComponent } from '../../components/public-repertoire-event-card/public-repertoire-event-card.component';
import {
  PublicDisplayService,
  REPERTOIRE_FILTERS,
  RepertoireGroup,
} from '../../shared/public-display.service';

type RepertoireView = 'current' | 'announced' | 'archive';

interface RepertoireDateGroup {
  key: string;
  label: string;
  events: PublicEvent[];
}

interface RepertoireMonthGroup {
  key: string;
  label: string;
  dateGroups: RepertoireDateGroup[];
}

interface ArchiveEntry {
  production: PublicProduction;
  venueNames: string[];
  playedAt: number;
}

const REPERTOIRE_VIEWS: Array<{ value: RepertoireView; label: string }> = [
  { value: 'current', label: 'Aktuelno' },
  { value: 'announced', label: 'U najavi' },
  { value: 'archive', label: 'Arhiva' },
];

@Component({
  selector: 'app-public-repertoire',
  standalone: true,
  imports: [
    CommonModule,
    PublicRepertoireAnnouncementComponent,
    PublicRepertoireArchiveCardComponent,
    PublicRepertoireEventCardComponent,
  ],
  templateUrl: './public-repertoire.component.html',
  styleUrl: './public-repertoire.component.scss',
})
export class PublicRepertoireComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly publicApi = inject(PublicApiService);
  readonly display = inject(PublicDisplayService);
  readonly views = REPERTOIRE_VIEWS;
  readonly genreFilters = REPERTOIRE_FILTERS.filter((item) => item.value !== 'all');

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly activeView = signal<RepertoireView>('current');
  readonly events = signal<PublicEvent[]>([]);
  readonly announcements = signal<PublicProduction[]>([]);
  readonly activeGenre = signal<RepertoireGroup>('all');
  readonly activeVenue = signal('all');
  readonly activeDirector = signal('all');
  readonly activeWriter = signal('all');

  private loadedRequest = '';
  private requestFilters: { month?: number; year?: number; view?: RepertoireView } = {};

  readonly heroImage = computed(() => this.publicApi.mediaUrl('/uploads/madlenianum/gostovanja_slika.jpg'));

  readonly venueOptions = computed(() => this.uniqueStrings(
    this.events().map((event) => event.venue?.name || event.venue?.title || '')
  ));

  readonly directorOptions = computed(() => this.creditOptions('director'));
  readonly writerOptions = computed(() => this.uniqueStrings([
    ...this.creditOptions('writer'),
    ...this.events().map((event) => this.publicApi.productionFromEvent(event)?.authorComposer || ''),
  ]));

  readonly filteredEvents = computed(() => this.events().filter((event) => {
    const production = this.publicApi.productionFromEvent(event);
    const venue = event.venue?.name || event.venue?.title || '';
    const genreMatches = this.activeGenre() === 'all'
      || Boolean(production && this.display.productionGroup(production) === this.activeGenre());
    const venueMatches = this.activeVenue() === 'all' || venue === this.activeVenue();
    return genreMatches && venueMatches;
  }));

  readonly monthGroups = computed<RepertoireMonthGroup[]>(() => {
    const months = new Map<string, RepertoireMonthGroup>();

    this.filteredEvents().forEach((event) => {
      if (!event.startsAt) return;
      const monthKey = this.monthKey(event.startsAt);
      let month = months.get(monthKey);
      if (!month) {
        month = { key: monthKey, label: this.monthLabel(event.startsAt), dateGroups: [] };
        months.set(monthKey, month);
      }

      const dateKey = this.display.dateKey(event.startsAt);
      let date = month.dateGroups.find((item) => item.key === dateKey);
      if (!date) {
        date = { key: dateKey, label: this.display.dayMonth(event.startsAt), events: [] };
        month.dateGroups.push(date);
      }
      date.events.push(event);
    });

    return Array.from(months.values());
  });

  readonly archiveEntries = computed<ArchiveEntry[]>(() => {
    const entries = new Map<string, ArchiveEntry>();

    this.events().forEach((event) => {
      const production = this.publicApi.productionFromEvent(event);
      if (!production) return;
      const key = production.id || production._id || production.slug;
      const venueName = event.venue?.name || event.venue?.title || '';
      const existing = entries.get(key);
      if (existing) {
        if (venueName && !existing.venueNames.includes(venueName)) existing.venueNames.push(venueName);
        return;
      }
      entries.set(key, {
        production,
        venueNames: venueName ? [venueName] : [],
        playedAt: this.timestamp(event),
      });
    });

    return Array.from(entries.values()).filter((entry) => {
      const production = entry.production;
      const genreMatches = this.activeGenre() === 'all'
        || this.display.productionGroup(production) === this.activeGenre();
      const venueMatches = this.activeVenue() === 'all' || entry.venueNames.includes(this.activeVenue());
      const directorMatches = this.activeDirector() === 'all'
        || this.creditNames(production, 'director').includes(this.activeDirector());
      const writerMatches = this.activeWriter() === 'all'
        || this.creditNames(production, 'writer').includes(this.activeWriter())
        || production.authorComposer === this.activeWriter();
      return genreMatches && venueMatches && directorMatches && writerMatches;
    }).sort((left, right) => {
      const posterDifference = Number(Boolean(right.production.poster)) - Number(Boolean(left.production.poster));
      return posterDifference || left.playedAt - right.playedAt;
    });
  });

  ngOnInit(): void {
    this.title.setTitle('Repertoar | Madlenianum');
    this.meta.updateTag({
      name: 'description',
      content: 'Aktuelni program, najave i arhiva Opere i teatra Madlenianum.',
    });

    this.route.queryParamMap.subscribe((params) => {
      const view = this.parseView(params.get('view'));
      const requestedGroup = params.get('group');
      const month = Number(params.get('month'));
      const year = Number(params.get('year'));
      const hasDate = month >= 1 && month <= 12 && year >= 2000;
      const requestKey = `${view}:${hasDate ? `${year}-${month}` : 'default'}`;

      this.activeView.set(view);
      this.activeGenre.set(this.isRepertoireGroup(requestedGroup) ? requestedGroup : 'all');
      this.resetSecondaryFilters();

      if (requestKey !== this.loadedRequest) {
        this.loadedRequest = requestKey;
        this.requestFilters = { view, ...(hasDate ? { month, year } : {}) };
        this.loadRepertoire(this.requestFilters);
      }
    });
  }

  selectView(view: RepertoireView): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        view: view === 'current' ? null : view,
        month: null,
        year: null,
        group: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  setVenue(value: string): void {
    this.activeVenue.set(value);
  }

  setGenre(value: string): void {
    this.activeGenre.set(this.isRepertoireGroup(value) ? value : 'all');
  }

  setDirector(value: string): void {
    this.activeDirector.set(value);
  }

  setWriter(value: string): void {
    this.activeWriter.set(value);
  }

  retry(): void {
    this.loadRepertoire(this.requestFilters);
  }

  private loadRepertoire(filters: { month?: number; year?: number; view?: RepertoireView }): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.publicApi.getRepertoire(filters).subscribe({
      next: (response) => this.applyResponse(response, filters.view || 'current'),
      error: (error) => {
        this.events.set([]);
        this.announcements.set([]);
        this.errorMessage.set(error?.error?.message || 'Repertoar trenutno nije dostupan.');
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false),
    });
  }

  private applyResponse(response: PublicRepertoireResponse, view: RepertoireView): void {
    const events = response.events || response.data?.events || [];
    const announcements = response.announcements || response.data?.announcements || [];
    this.events.set([...events].sort((a, b) => this.timestamp(a) - this.timestamp(b)));
    this.announcements.set(announcements);
    this.activeView.set(view);
  }

  private parseView(value: string | null): RepertoireView {
    return value === 'announced' || value === 'archive' ? value : 'current';
  }

  private isRepertoireGroup(value: string | null): value is RepertoireGroup {
    return ['all', 'dramski', 'muzicki', 'gostovanja'].includes(value || '');
  }

  private timestamp(event: PublicEvent): number {
    return event.startsAt ? new Date(event.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
  }

  private monthKey(value: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      timeZone: this.display.timeZone,
    }).format(new Date(value));
  }

  private monthLabel(value: string): string {
    const date = new Date(value);
    const month = new Intl.DateTimeFormat('sr-Latn-RS', {
      month: 'short',
      timeZone: this.display.timeZone,
    }).format(date).replace('.', '');
    const year = Number(new Intl.DateTimeFormat('en', {
      year: 'numeric',
      timeZone: this.display.timeZone,
    }).format(date));
    const label = month.charAt(0).toUpperCase() + month.slice(1);
    return year === new Date().getFullYear() ? label : `${label} ${year}`;
  }

  private creditOptions(roleKey: string): string[] {
    return this.uniqueStrings(this.events().flatMap((event) => {
      const production = this.publicApi.productionFromEvent(event);
      return production ? this.creditNames(production, roleKey) : [];
    }));
  }

  private creditNames(production: PublicProduction, roleKey: string): string[] {
    return (production.primaryCredits || production.creativeTeam || [])
      .filter((credit) => credit.roleKey === roleKey)
      .map((credit) => credit.artist?.displayName || credit.name || '')
      .filter(Boolean);
  }

  private uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'sr-Latn-RS'));
  }

  private resetSecondaryFilters(): void {
    this.activeVenue.set('all');
    this.activeDirector.set('all');
    this.activeWriter.set('all');
  }
}
