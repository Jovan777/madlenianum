import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicApiService } from '../../../core/services/public-api.service';

interface AboutTimelineItem {
  period: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-public-about-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-about-view.component.html',
  styleUrl: './public-about-view.component.scss',
})
export class PublicAboutViewComponent {
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
      title: 'Rađanje vizije i prva Kamerna opera',
      description: 'Madlenianum počinje svoj život kao Kamerna opera pod pokroviteljstvom gospođe Madlene Zepter. Prva izvedena predstava označila je osnivanje prve privatne opere i teatra u ovom delu Evrope.',
    },
    {
      period: '2005',
      title: 'Novo ruho i velika rekonstrukcija',
      description: 'Zgrada nekadašnjeg Narodnog pozorišta u Zemunu prolazi kroz monumentalnu rekonstrukciju. Teatar dobija današnji izgled, raskošan foaje i tehnološki opremljen prostor.',
    },
    {
      period: '2007',
      title: 'Revolucija mjuzikla na domaćoj sceni',
      description: 'Madlenianum pravi hrabar produkcijski iskorak i postavlja velike naslove koji uvode nove standarde muzičkog teatra na Balkanu.',
    },
    {
      period: '2019',
      title: 'Tehnološki vrhunac i „Fantom iz opere“',
      description: 'Audio i vizuelni sistemi Velike sale podignuti su na nivo vodećih evropskih teatara, potvrđujući status Madlenianuma kao tehnički najnaprednije scene u zemlji.',
    },
    {
      period: '2026',
      title: 'Sinergija tradicije i inovacije',
      description: 'Madlenianum danas spaja operu, balet, dramu i savremeno scensko stvaralaštvo, ostajući otvoren za nove umetnike, publiku i međunarodne projekte.',
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
    return heading && heading !== 'Kuca umetnosti' ? heading : 'Kuća umetnosti u srcu Zemuna';
  }

  introBody(): string {
    const body = this.section('text-image')?.body;
    if (body && !body.includes('okuplja umetnike i publiku')) return body;
    return '<p>Opera i teatar Madlenianum predstavlja jedinstveno mesto susreta klasične tradicije i savremenog scenskog izraza. Od osnivanja, kuća neguje operu, balet, dramu, mjuzikl i koncertni program.</p><p>Smešten u istorijskom jezgru Zemuna, Madlenianum publici pruža vrhunski umetnički doživljaj, a stvaraocima prostor u kojem ideje dobijaju pun scenski život.</p>';
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
          alt: item?.altText || item?.media?.altText || 'Madlenianum scena',
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
