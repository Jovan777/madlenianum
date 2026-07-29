import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { PublicSeo } from '../models/public.models';
import { LocalizedPageLinks, PublicLocaleService } from './public-locale.service';

@Injectable({ providedIn: 'root' })
export class PublicSeoService {
  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    private readonly locale: PublicLocaleService,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  update(seo: PublicSeo | null | undefined, fallbackTitle: string, fallbackDescription = '', links?: LocalizedPageLinks): void {
    const pageTitle = seo?.title || fallbackTitle;
    const description = seo?.description || fallbackDescription;
    const canonical = this.absoluteUrl(seo?.canonicalUrl || this.currentPath());
    const noIndex = Boolean(seo?.noIndex);

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: noIndex ? 'noindex,nofollow' : 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:locale', content: this.locale.isEnglish() ? 'en_US' : 'sr_RS' });
    this.setLink('canonical', canonical);
    this.removeAlternateLinks();
    if (links?.sr) this.setAlternate('sr', this.absoluteUrl(links.sr));
    if (links?.en) this.setAlternate('en', this.absoluteUrl(links.en));
    if (links?.sr) this.setAlternate('x-default', this.absoluteUrl(links.sr));
  }

  markUnavailable(title: string): void {
    this.update({ noIndex: true }, title);
  }

  private currentPath(): string {
    return `${this.document.location.pathname}${this.document.location.search}`;
  }

  private absoluteUrl(value: string): string {
    if (/^https?:\/\//i.test(value)) return value;
    return new URL(value || '/', this.document.location.origin).toString();
  }

  private setLink(rel: string, href: string): void {
    let element = this.document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]:not([hreflang])`);
    if (!element) {
      element = this.document.createElement('link');
      element.rel = rel;
      this.document.head.appendChild(element);
    }
    element.href = href;
  }

  private setAlternate(hreflang: string, href: string): void {
    const element = this.document.createElement('link');
    element.rel = 'alternate';
    element.hreflang = hreflang;
    element.href = href;
    element.dataset['publicLocaleLink'] = 'true';
    this.document.head.appendChild(element);
  }

  private removeAlternateLinks(): void {
    this.document.head.querySelectorAll('link[data-public-locale-link="true"]').forEach((element) => element.remove());
  }
}
