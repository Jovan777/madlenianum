import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import {
  PublicCastMember,
  PublicEvent,
  PublicGalleryItem,
  PublicMedia,
  PublicProduction,
  PublicProductionCredit,
  PublicVideo,
} from '../../../core/models/public.models';
import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicVideoModalComponent } from '../../components/public-video-modal/public-video-modal.component';
import { PublicDisplayService } from '../../shared/public-display.service';

@Component({
  selector: 'app-public-production-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicVideoModalComponent],
  templateUrl: './public-production-detail.component.html',
  styleUrl: './public-production-detail.component.scss',
})
export class PublicProductionDetailComponent implements OnInit {
  readonly publicApi = inject(PublicApiService);
  readonly display = inject(PublicDisplayService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly production = signal<PublicProduction | null>(null);
  readonly events = signal<PublicEvent[]>([]);
  readonly selectedVideo = signal<PublicVideo | null>(null);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';

    this.publicApi.getProduction(slug).subscribe({
      next: (response) => {
        const item = this.publicApi.extractItem<PublicProduction>(response, ['production', 'item']);
        const upcomingEvents = this.publicApi.extractItems<PublicEvent>(response, ['upcomingEvents', 'events']);
        this.production.set(item);
        this.events.set(upcomingEvents);
        if (item) {
          this.applySeo(item);
        }
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Predstava trenutno nije dostupna.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  image(value: unknown, fallbackIndex = 0): string {
    return this.publicApi.mediaUrl(value) || this.publicApi.fallbackImage(fallbackIndex);
  }

  heroImage(production: PublicProduction): string {
    return this.image(production.announcement?.image || this.galleryImageValue(production, 0) || production.poster);
  }

  posterImage(production: PublicProduction): string {
    return this.image(production.poster || this.galleryImageValue(production, 0));
  }

  typeLabel(production: PublicProduction): string {
    return this.display.productionType(production.type);
  }

  heroMeta(production: PublicProduction): string {
    return [this.typeLabel(production), production.authorComposer].filter(Boolean).join(' | ');
  }

  synopsisHtml(production: PublicProduction): string {
    const body = production.description || production.synopsis || production.shortDescription || 'Sadržaj će biti dodat kroz admin panel.';
    if (/<[a-z][\s\S]*>/i.test(body)) {
      return body;
    }

    return body
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${this.escapeHtml(paragraph.trim())}</p>`)
      .join('');
  }

  ticketEvent(): PublicEvent | null {
    return this.events().find((event) => this.canPurchase(event)) || this.events()[0] || null;
  }

  canPurchase(event: PublicEvent | null | undefined): boolean {
    return event ? this.display.eventSale(event).canPurchase : false;
  }

  saleLabel(event: PublicEvent | null | undefined): string {
    return event ? this.display.eventSale(event).label : 'Termini uskoro';
  }

  eventId(event: PublicEvent | null | undefined): string {
    return event ? this.publicApi.eventId(event) : '';
  }

  eventDayMonth(event: PublicEvent): string {
    return this.display.dayMonth(event.startsAt).replace('.', '. ');
  }

  eventTime(event: PublicEvent): string {
    return this.display.time(event.startsAt);
  }

  venueName(event: PublicEvent): string {
    return event.venue?.name || event.venue?.title || 'Madlenianum';
  }

  isPremiere(event: PublicEvent): boolean {
    return Boolean(event.isPremiere || /premijer/i.test(event.badge || ''));
  }

  detailFacts(production: PublicProduction): Array<{ label: string; value: string; icon: string }> {
    return [
      {
        label: 'Tekst',
        value: this.creditValue(production, ['writer']) || production.authorComposer || '',
        icon: 'text',
      },
      {
        label: 'Režija',
        value: this.creditValue(production, ['director']) || '',
        icon: 'director',
      },
      {
        label: 'Trajanje',
        value: this.durationLabel(production.durationMinutes),
        icon: 'time',
      },
    ].filter((item) => item.value);
  }

  galleryItems(production: PublicProduction): Array<PublicGalleryItem | PublicMedia | string> {
    if (production.galleryItems?.length) {
      return production.galleryItems;
    }

    return production.gallery || [];
  }

  galleryImage(item: PublicGalleryItem | PublicMedia | string, index: number): string {
    return this.image(this.isGalleryItem(item) ? item.media : item, index);
  }

  galleryAlt(item: PublicGalleryItem | PublicMedia | string, production: PublicProduction): string {
    if (this.isGalleryItem(item)) {
      return item.altText || item.caption || production.title;
    }

    if (typeof item === 'object') {
      return item.altText || item.alt || item.title || production.title;
    }

    return production.title;
  }

  galleryCredit(production: PublicProduction): string {
    const firstCredit = this.galleryItems(production)
      .map((item) => this.isGalleryItem(item) ? item.credit : (typeof item === 'object' ? item.credit : ''))
      .find(Boolean);
    return firstCredit || '';
  }

  castCards(production: PublicProduction): PublicCastMember[] {
    return (production.cast || []).filter((member) => this.castName(member));
  }

  castName(member: PublicCastMember): string {
    return member.artist?.displayName || member.name || '';
  }

  castRole(member: PublicCastMember): string {
    return member.role || member.character || '';
  }

  castImage(member: PublicCastMember, index: number): string {
    return this.image(member.artist?.image, index + 7);
  }

  hasCastImage(member: PublicCastMember): boolean {
    return Boolean(member.artist?.image);
  }

  artistSlug(member: PublicCastMember): string {
    return member.artist?.slug || '';
  }

  trailer(production: PublicProduction): PublicVideo | null {
    return production.trailer?.url ? production.trailer : null;
  }

  openTrailer(video: PublicVideo | null): void {
    if (video) {
      this.selectedVideo.set(video);
    }
  }

  closeTrailer(): void {
    this.selectedVideo.set(null);
  }

  private creditValue(production: PublicProduction, roleKeys: string[]): string {
    const credit = (production.primaryCredits || production.creativeTeam || [])
      .find((item) => roleKeys.includes(item.roleKey || '') || roleKeys.some((key) => this.roleMatches(item, key)));
    return credit ? this.creditName(credit) : '';
  }

  private creditName(credit: PublicProductionCredit): string {
    return credit.name || credit.artist?.displayName || '';
  }

  private roleMatches(credit: PublicProductionCredit, key: string): boolean {
    const label = `${credit.label || ''} ${credit.role || ''}`.toLowerCase();
    if (key === 'writer') return label.includes('tekst') || label.includes('pis') || label.includes('autor');
    if (key === 'director') return label.includes('redit');
    return false;
  }

  private durationLabel(minutes: number | undefined): string {
    if (!minutes) {
      return '';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return [
      hours ? `${hours}h` : '',
      remainingMinutes ? `${remainingMinutes}m` : '',
    ].filter(Boolean).join(' ');
  }

  private galleryImageValue(production: PublicProduction, index: number): unknown {
    const item = this.galleryItems(production)[index];
    return this.isGalleryItem(item) ? item.media : item;
  }

  private isGalleryItem(item: unknown): item is PublicGalleryItem {
    return Boolean(item && typeof item === 'object' && 'media' in item);
  }

  private applySeo(production: PublicProduction): void {
    const seoTitle = production.seo?.title || `${production.title} | Madlenianum`;
    const description = production.seo?.description || production.shortDescription || production.synopsis || '';
    this.title.setTitle(seoTitle);
    if (description) {
      this.meta.updateTag({ name: 'description', content: description.replace(/<[^>]*>/g, '').slice(0, 160) });
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
