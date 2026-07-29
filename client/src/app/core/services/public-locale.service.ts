import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

export type PublicLocale = 'sr' | 'en';

export interface LocalizedPageLinks {
  sr: string;
  en?: string;
}

const STORAGE_KEY = 'madlenianum_public_locale';

const SR_TO_EN_SEGMENTS: Record<string, string> = {
  repertoar: 'repertoire',
  predstave: 'productions',
  kupovina: 'tickets',
  porudzbina: 'order',
  umetnici: 'artists',
  vesti: 'news',
  fundusi: 'fundus',
  kostimi: 'costumes',
  'rekviziti-scenografija': 'props-scenography',
  'zakup-prostora': 'venue-rental',
  strana: 'page',
};

const EN_TO_SR_SEGMENTS = Object.fromEntries(
  Object.entries(SR_TO_EN_SEGMENTS).map(([sr, en]) => [en, sr])
);

const LOCALIZED_ROUTE_PAIRS: ReadonlyArray<{ sr: string; en: string }> = [
  { sr: '/strana/o-nama', en: '/en/about' },
  { sr: '/strana/kontakt', en: '/en/contact' },
  { sr: '/fundusi/rekviziti-scenografija', en: '/en/fundus/props-scenography' },
  { sr: '/fundusi/kostimi', en: '/en/fundus/costumes' },
  { sr: '/zakup-prostora', en: '/en/venue-rental' },
  { sr: '/predstave', en: '/en/productions' },
  { sr: '/repertoar', en: '/en/repertoire' },
  { sr: '/porudzbina', en: '/en/order' },
  { sr: '/kupovina', en: '/en/tickets' },
  { sr: '/umetnici', en: '/en/artists' },
  { sr: '/fundusi', en: '/en/fundus' },
  { sr: '/vesti', en: '/en/news' },
  { sr: '/', en: '/en' },
];

@Injectable({ providedIn: 'root' })
export class PublicLocaleService {
  readonly locale = signal<PublicLocale>('sr');
  readonly preferredLocale = signal<PublicLocale>(this.readStoredLocale());

  private pageLinks: LocalizedPageLinks | null = null;

  constructor(
    private readonly router: Router,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    this.syncFromUrl(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationStart | NavigationEnd => event instanceof NavigationStart || event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.pageLinks = null;
          return;
        }

        this.syncFromUrl(event.urlAfterRedirects);
      });
  }

  current(): PublicLocale {
    return this.locale();
  }

  isEnglish(): boolean {
    return this.locale() === 'en';
  }

  registerPageLinks(links: LocalizedPageLinks | null | undefined): void {
    this.pageLinks = links?.sr ? links : null;
  }

  async switchTo(locale: PublicLocale): Promise<boolean> {
    const targetLocale = locale === 'en' ? 'en' : 'sr';
    const currentTree = this.router.parseUrl(this.router.url);
    const primarySegments =
      currentTree.root.children['primary']?.segments.map((segment) => segment.path) ?? [];
    const currentPath = primarySegments.length ? `/${primarySegments.join('/')}` : '/';
    const registeredTarget = this.pageLinks?.[targetLocale];
    const targetPath = registeredTarget || this.equivalentPath(currentPath, targetLocale);

    this.preferredLocale.set(targetLocale);
    this.persist(targetLocale);

    const targetTree = this.router.parseUrl(targetPath);
    targetTree.queryParams = currentTree.queryParams;
    targetTree.fragment = currentTree.fragment;
    return this.router.navigateByUrl(targetTree);
  }

  equivalentPath(path: string, locale: PublicLocale): string {
    const cleanPath = (path || '/').split('?')[0].split('#')[0];
    const pairedPath = this.pairedPath(cleanPath, locale);
    if (pairedPath) {
      return pairedPath;
    }

    const segments = cleanPath.split('/').filter(Boolean);
    const sourceSegments = segments[0] === 'en' ? segments.slice(1) : segments;
    const dictionary = locale === 'en' ? SR_TO_EN_SEGMENTS : EN_TO_SR_SEGMENTS;
    const localized = sourceSegments.map((segment) => dictionary[segment] || segment);

    if (locale === 'en') {
      return '/' + ['en', ...localized].join('/');
    }

    return localized.length ? '/' + localized.join('/') : '/';
  }

  localizedPath(srPath: string, enPath?: string): string {
    return this.isEnglish() ? (enPath || this.equivalentPath(srPath, 'en')) : srPath;
  }

  productionPath(slug?: string): string {
    return this.detailPath('/predstave', '/en/productions', slug);
  }

  artistPath(slug?: string): string {
    return this.detailPath('/umetnici', '/en/artists', slug);
  }

  newsPath(slug?: string): string {
    return this.detailPath('/vesti', '/en/news', slug);
  }

  ticketPath(eventId?: string): string {
    return this.detailPath('/kupovina', '/en/tickets', eventId);
  }

  orderPath(identifier?: string): string {
    return this.detailPath('/porudzbina', '/en/order', identifier);
  }

  rentalSpacePath(slug?: string): string {
    return this.detailPath('/zakup-prostora', '/en/venue-rental', slug);
  }

  fundusPath(kind?: 'costume' | 'prop', slug?: string): string {
    if (!kind) {
      return this.localizedPath('/fundusi', '/en/fundus');
    }

    const srBase = kind === 'costume' ? '/fundusi/kostimi' : '/fundusi/rekviziti-scenografija';
    const enBase = kind === 'costume' ? '/en/fundus/costumes' : '/en/fundus/props-scenography';
    return this.detailPath(srBase, enBase, slug);
  }

  private syncFromUrl(url: string): void {
    if (url.startsWith('/admin')) {
      return;
    }

    const nextLocale: PublicLocale = /^\/en(?:\/|$)/.test(url) ? 'en' : 'sr';
    this.locale.set(nextLocale);
    this.preferredLocale.set(nextLocale);
    this.persist(nextLocale);
    this.document.documentElement.lang = nextLocale;
  }

  private detailPath(srBase: string, enBase: string, value?: string): string {
    const base = this.localizedPath(srBase, enBase);
    const segment = String(value || '').trim();
    return segment ? `${base}/${encodeURIComponent(segment)}` : base;
  }

  private pairedPath(path: string, locale: PublicLocale): string | null {
    const normalized = path !== '/' ? path.replace(/\/+$/, '') : '/';
    const sourceKey = locale === 'en' ? 'sr' : 'en';
    const targetKey = locale;

    for (const pair of LOCALIZED_ROUTE_PAIRS) {
      const source = pair[sourceKey];
      if (normalized === source) {
        return pair[targetKey];
      }
      if (source !== '/' && normalized.startsWith(`${source}/`)) {
        return `${pair[targetKey]}${normalized.slice(source.length)}`;
      }
    }

    return null;
  }

  private readStoredLocale(): PublicLocale {
    if (typeof localStorage === 'undefined') {
      return 'sr';
    }

    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'sr';
  }

  private persist(locale: PublicLocale): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale);
    }
  }
}
