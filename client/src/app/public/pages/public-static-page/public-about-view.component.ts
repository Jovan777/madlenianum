import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicApiService } from '../../../core/services/public-api.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import { PublicTranslatePipe } from '../../i18n/public-translate.pipe';

interface AboutTimelineItem {
  period: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-public-about-view',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicTranslatePipe],
  templateUrl: './public-about-view.component.html',
  styleUrl: './public-about-view.component.scss',
})
export class PublicAboutViewComponent {
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);
  @Input({ required: true }) page: any;

  readonly featureImageIndex = signal(0);
  readonly aboutImages = [
    '/madlenianum/about/madlenianum-about1.jpg',
    '/madlenianum/about/madlenianum-about2.jpg',
    '/madlenianum/about/madlenianum-about3.jpg',
    '/madlenianum/about/madlenianum-about4.jpg',
  ];
  readonly founderImage = '/madlenianum/about/madlena-zepter.png';

  readonly fallbackTimeline: AboutTimelineItem[] = [
    {
      period: '1998',
      title: this.i18n.t('about.timeline.1998.title'),
      description: this.i18n.t('about.timeline.1998.text'),
    },
    {
      period: '2005',
      title: this.i18n.t('about.timeline.2005.title'),
      description: this.i18n.t('about.timeline.2005.text'),
    },
    {
      period: '2007',
      title: this.i18n.t('about.timeline.2007.title'),
      description: this.i18n.t('about.timeline.2007.text'),
    },
    {
      period: '2019',
      title: this.i18n.t('about.timeline.2019.title'),
      description: this.i18n.t('about.timeline.2019.text'),
    },
    {
      period: '2026',
      title: this.i18n.t('about.timeline.2026.title'),
      description: this.i18n.t('about.timeline.2026.text'),
    },
  ];

  constructor(readonly publicApi: PublicApiService) {}

  sections(): any[] {
    return Array.isArray(this.page?.sections)
      ? [...this.page.sections].filter((item) => item?.enabled !== false).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      : [];
  }

  section(type: string): any {
    return this.sections().find((item) => item.sectionType === type) || {};
  }

  introHeading(): string {
    const heading = this.section('text-image')?.heading;
    return heading && heading !== 'Kuca umetnosti' ? heading : this.i18n.t('about.introTitle');
  }

  introBody(): string {
    const body = this.section('text-image')?.body;
    if (body && !body.includes('okuplja umetnike i publiku')) return body;
    return this.i18n.t('about.introBody');
  }

  timeline(): AboutTimelineItem[] {
    const items = this.section('timeline')?.timelineItems;
    return Array.isArray(items) && items.length >= 3 ? items : this.fallbackTimeline;
  }

  galleryImages(): Array<{ src: string; alt: string; credit: string }> {
    const items = this.section('gallery')?.galleryItems;
    const resolved = Array.isArray(items)
      ? items.map((item: any) => ({
          src: this.publicApi.mediaUrl(item?.media),
          alt: item?.altText || item?.media?.altText || this.i18n.t('about.stageTitle'),
          credit: item?.credit || item?.media?.credit || '',
        })).filter((item: any) => item.src)
      : [];
    const fallbacks = [this.aboutImages[3], this.aboutImages[2], this.aboutImages[1]]
      .map((src, index) => ({ src, alt: `Madlenianum ${index + 1}`, credit: 'Madlenianum' }));
    return [...resolved, ...fallbacks].slice(0, 4);
  }

  featureImage(): string {
    return [this.aboutImages[2], this.aboutImages[3]][this.featureImageIndex()];
  }

  changeFeature(direction: -1 | 1): void {
    this.featureImageIndex.update((current) => (current + direction + 2) % 2);
  }
}
