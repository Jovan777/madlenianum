import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { PublicSiteSettings } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { PublicLocale, PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import {
  PUBLIC_NAVIGATION,
  PUBLIC_PARTNER_MENU,
  PUBLIC_RENTAL_MENU,
  PUBLIC_REPERTOIRE_MENU,
  PublicRepertoireMenuItem,
} from '../../shared/public-navigation';

type HeaderMenu = 'repertoire' | 'partners' | 'rental';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './public-header-view.html',
  styleUrl: './public-header-view.scss',
})
export class PublicHeaderComponent {
  readonly settings = input<PublicSiteSettings | null>(null);
  readonly menuOpen = signal(false);
  readonly openDesktopMenu = signal<HeaderMenu | null>(null);
  readonly languageMenuOpen = signal(false);
  readonly navItems = PUBLIC_NAVIGATION;
  readonly repertoireItems = PUBLIC_REPERTOIRE_MENU;
  readonly partnerItems = PUBLIC_PARTNER_MENU;
  readonly rentalItems = PUBLIC_RENTAL_MENU;
  private readonly media = inject(MediaUrlService);
  private readonly router = inject(Router);
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);

  homeRoute(): string {
    return this.locale.isEnglish() ? '/en' : '/';
  }

  path(srPath: string): string {
    return this.locale.equivalentPath(srPath, this.locale.current());
  }

  aboutRoute(): string {
    return this.locale.isEnglish() ? '/en/about' : '/strana/o-nama';
  }

  contactRoute(): string {
    return this.locale.isEnglish() ? '/en/contact' : '/strana/kontakt';
  }

  repertoireItemLabel(index: number): string {
    const labels = this.locale.isEnglish()
      ? ['Full repertoire', 'Drama', 'Music theatre', 'Guest performances']
      : ['Ceo repertoar', 'Dramski', 'Muzički', 'Gostovanja'];
    return labels[index] || this.repertoireItems[index]?.label || '';
  }

  rentalItemLabel(index: number): string {
    const labels = this.locale.isEnglish()
      ? ['Collections, props & scenography', 'Venue rental']
      : ['Fundusi i rekviziti', 'Zakup prostora'];
    return labels[index] || this.rentalItems[index]?.label || '';
  }

  rentalItemDescription(index: number): string {
    const descriptions = this.locale.isEnglish()
      ? [
          'Costumes, stage props and scenography from the Madlenianum collections.',
          'Halls and representative spaces for events, conferences and celebrations.',
        ]
      : [
          'Kostimi, scenski rekviziti i scenografija iz fundusa Madlenianuma.',
          'Sale i reprezentativni prostori za događaje, konferencije i proslave.',
        ];
    return descriptions[index] || this.rentalItems[index]?.description || '';
  }

  switchLanguage(locale: PublicLocale): void {
    this.closeMenu();
    void this.locale.switchTo(locale);
  }

  logo(): string {
    return this.media.resolve(this.settings()?.mainLogo) || '/madlenianum/logo.png';
  }

  menuImage(item: PublicRepertoireMenuItem): string {
    return this.media.resolve(item.image);
  }

  toggleMenu(): void {
    this.openDesktopMenu.set(null);
    this.languageMenuOpen.set(false);
    this.menuOpen.update((value) => !value);
  }

  toggleDesktopMenu(menu: HeaderMenu): void {
    this.menuOpen.set(false);
    this.languageMenuOpen.set(false);
    this.openDesktopMenu.update((value) => value === menu ? null : menu);
  }

  toggleLanguageMenu(): void {
    this.menuOpen.set(false);
    this.openDesktopMenu.set(null);
    this.languageMenuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.openDesktopMenu.set(null);
    this.languageMenuOpen.set(false);
  }

  repertoireRouteIsActive(): boolean {
    return this.router.url.startsWith('/repertoar') || this.router.url.startsWith('/predstave')
      || this.router.url.startsWith('/en/repertoire') || this.router.url.startsWith('/en/productions');
  }

  rentalRouteIsActive(): boolean {
    return this.router.url.startsWith('/fundusi') || this.router.url.startsWith('/zakup-prostora')
      || this.router.url.startsWith('/en/fundus') || this.router.url.startsWith('/en/venue-rental');
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closeMenu();
  }

  @HostListener('window:resize')
  handleResize(): void {
    if (window.innerWidth <= 1000) {
      this.openDesktopMenu.set(null);
      this.languageMenuOpen.set(false);
    }
  }
}
