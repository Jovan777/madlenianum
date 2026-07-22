import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { PublicSiteSettings } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { PUBLIC_NAVIGATION, PUBLIC_REPERTOIRE_MENU } from '../../shared/public-navigation';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './public-header.component.html',
  styleUrl: './public-header.component.scss',
})
export class PublicHeaderComponent {
  @ViewChild('repertoireTrigger') private repertoireTrigger?: ElementRef<HTMLButtonElement>;

  readonly settings = input<PublicSiteSettings | null>(null);
  readonly menuOpen = signal(false);
  readonly repertoireMenuOpen = signal(false);
  readonly navItems = PUBLIC_NAVIGATION;
  readonly repertoireItems = PUBLIC_REPERTOIRE_MENU;
  private readonly media = inject(MediaUrlService);
  private readonly router = inject(Router);

  logo(): string {
    return this.media.resolve(this.settings()?.mainLogo) || '/madlenianum/logo.png';
  }

  toggleMenu(): void {
    this.repertoireMenuOpen.set(false);
    this.menuOpen.update((value) => !value);
  }

  toggleRepertoireMenu(): void {
    this.menuOpen.set(false);
    this.repertoireMenuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.repertoireMenuOpen.set(false);
  }

  repertoireRouteIsActive(): boolean {
    return this.router.url.startsWith('/repertoar') || this.router.url.startsWith('/predstave');
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    const returnFocus = this.repertoireMenuOpen();
    this.closeMenu();
    if (returnFocus) {
      this.repertoireTrigger?.nativeElement.focus();
    }
  }

  @HostListener('window:resize')
  handleResize(): void {
    if (window.innerWidth <= 1000) {
      this.repertoireMenuOpen.set(false);
    }
  }
}
