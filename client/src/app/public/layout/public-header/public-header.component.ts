import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { PublicSiteSettings } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
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
    return this.router.url.startsWith('/repertoar') || this.router.url.startsWith('/predstave');
  }

  rentalRouteIsActive(): boolean {
    return this.router.url.startsWith('/fundusi') || this.router.url.startsWith('/zakup-prostora');
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
