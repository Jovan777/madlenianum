import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicNavLink, PublicSiteSettings } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { isAvailablePublicDestination, isExternalUrl } from '../../shared/public-navigation';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-footer.component.html',
  styleUrl: './public-footer.component.scss',
})
export class PublicFooterComponent {
  readonly settings = input<PublicSiteSettings | null>(null);
  readonly media = inject(MediaUrlService);
  readonly currentYear = new Date().getFullYear();
  readonly isExternal = isExternalUrl;

  readonly navigationGroups = computed(() => (this.settings()?.footerNavigation || [])
    .map((group) => ({
      ...group,
      links: (group.links || []).filter((link) => isAvailablePublicDestination(link.url)),
    }))
    .filter((group) => group.title && group.links.length)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));

  readonly legalLinks = computed(() => (this.settings()?.legalLinks || [])
    .filter((link) => isAvailablePublicDestination(link.url)));

  readonly socialLinks = computed(() => (this.settings()?.socialLinks || [])
    .filter((link) => isExternalUrl(link.url)));

  readonly partners = computed(() => (this.settings()?.partnerLogos || [])
    .filter((partner) => this.media.resolve(partner.media))
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));

  logo(): string {
    return this.media.resolve(this.settings()?.footerLogo)
      || this.media.resolve(this.settings()?.mainLogo)
      || '/madlenianum/logo.png';
  }

  socialShort(link: PublicNavLink & { platform?: string }): string {
    const platform = (link.platform || link.label || '').toLowerCase();
    if (platform.includes('instagram')) return 'IG';
    if (platform.includes('youtube')) return 'YT';
    if (platform.includes('facebook')) return 'FB';
    return (link.label || 'Link').slice(0, 2).toUpperCase();
  }
}
