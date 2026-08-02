import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicNavLink, PublicSiteSettings } from '../../../core/models/public.models';
import { MediaUrlService } from '../../../core/services/media-url.service';
import { PublicLocaleService } from '../../../core/services/public-locale.service';
import { PublicI18nService } from '../../i18n/public-i18n.service';
import {
  PUBLIC_SOCIAL_LINKS,
  isAvailablePublicDestination,
  isExternalUrl,
  publicFooterNavigation,
  publicLegalLinks,
} from '../../shared/public-navigation';

interface FooterLinkView extends PublicNavLink {
  platform?: string;
  route: string;
  queryParams?: Record<string, string>;
  fragment?: string;
}

interface FooterGroupView {
  title: string;
  displayOrder?: number;
  titleLink?: FooterLinkView;
  links: FooterLinkView[];
}

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
  readonly locale = inject(PublicLocaleService);
  readonly i18n = inject(PublicI18nService);

  readonly navigationGroups = computed<FooterGroupView[]>(() => {
    const configured = (this.settings()?.footerNavigation || [])
      .map((group) => ({
        ...group,
        links: (group.links || []).filter((link) => isAvailablePublicDestination(link.url)),
      }))
      .filter((group) => group.title && group.links.length)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const configuredUrls = configured.flatMap((group) => group.links.map((link) => link.url));
    const hasCompleteFooter = configured.length >= 4
      && configuredUrls.some((url) => url.startsWith('/fundusi'))
      && configuredUrls.some((url) => url.startsWith('/zakup-prostora'));
    const defaultGroups = publicFooterNavigation(this.locale.current());
    const groups = hasCompleteFooter
      ? configured
      : defaultGroups;

    return groups.map((group, index) => {
      const titleUrl = (group as { url?: string }).url || defaultGroups[index]?.url || '/';
      return {
        ...group,
        titleLink: this.linkView({ label: group.title, url: titleUrl }),
        links: group.links.map((link) => this.linkView(link)),
      };
    });
  });

  readonly legalLinks = computed<FooterLinkView[]>(() => {
    const configured = (this.settings()?.legalLinks || [])
      .filter((link) => isAvailablePublicDestination(link.url));
    const links = configured.length ? configured : publicLegalLinks(this.locale.current());
    return links.map((link) => this.linkView(link));
  });

  readonly socialLinks = computed<FooterLinkView[]>(() => {
    const configured = (this.settings()?.socialLinks || [])
      .filter((link) => isExternalUrl(link.url));
    const required = PUBLIC_SOCIAL_LINKS.map((fallback) => {
      const configuredLink = configured.find((link) => this.socialPlatform(link) === fallback.platform);
      return configuredLink ? { ...fallback, ...configuredLink } : fallback;
    });
    const additional = configured.filter((link) => !required.some((item) => this.socialPlatform(item) === this.socialPlatform(link)));
    return [...required, ...additional]
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((link) => this.linkView(link));
  });

  readonly partners = computed(() => (this.settings()?.partnerLogos || [])
    .filter((partner) => this.media.resolve(partner.media))
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));

  logo(): string {
    return this.media.resolve(this.settings()?.footerLogo)
      || this.media.resolve(this.settings()?.mainLogo)
      || '/madlenianum/LogoMadlenianum%20(1).png';
  }

  socialPlatform(link: PublicNavLink & { platform?: string }): string {
    const platform = (link.platform || link.label || '').toLowerCase();
    if (platform.includes('instagram')) return 'instagram';
    if (platform.includes('youtube')) return 'youtube';
    if (platform.includes('facebook')) return 'facebook';
    return 'other';
  }

  private linkView(link: PublicNavLink & { platform?: string }): FooterLinkView {
    if (isExternalUrl(link.url)) {
      return { ...link, route: '' };
    }

    const [pathAndQuery, fragment] = link.url.split('#', 2);
    const [path, queryString] = pathAndQuery.split('?', 2);
    const queryParams: Record<string, string> = {};
    new URLSearchParams(queryString || '').forEach((value, key) => {
      queryParams[key] = value;
    });

    return {
      ...link,
      route: this.locale.equivalentPath(path || '/', this.locale.current()),
      queryParams: Object.keys(queryParams).length ? queryParams : undefined,
      fragment: fragment || undefined,
    };
  }
}
