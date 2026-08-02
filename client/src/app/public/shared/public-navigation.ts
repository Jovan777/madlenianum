export interface PublicNavigationItem {
  label: string;
  path: string;
}

export interface PublicRepertoireMenuItem {
  label: string;
  path: string;
  image: string;
  queryParams?: Record<string, string>;
}

export interface PublicPartnerMenuItem {
  label: string;
  url: string;
  image: string;
}

export interface PublicRentalMenuItem {
  label: string;
  description: string;
  path: string;
  image: string;
}

export interface PublicFooterLink {
  label: string;
  url: string;
  displayOrder?: number;
  platform?: 'instagram' | 'youtube' | 'facebook';
}

export interface PublicFooterNavigationGroup {
  title: string;
  url?: string;
  displayOrder: number;
  links: PublicFooterLink[];
}

const PUBLIC_FOOTER_NAVIGATION_SR: PublicFooterNavigationGroup[] = [
  {
    title: 'Repertoar',
    url: '/repertoar',
    displayOrder: 0,
    links: [
      { label: 'Dramski', url: '/repertoar?group=dramski', displayOrder: 0 },
      { label: 'Muzički', url: '/repertoar?group=muzicki', displayOrder: 1 },
      { label: 'Gostovanja', url: '/repertoar?group=gostovanja', displayOrder: 2 },
    ],
  },
  {
    title: 'Partnerstvo',
    url: '/zakup-prostora',
    displayOrder: 1,
    links: [
      { label: 'Zakup prostora', url: '/zakup-prostora', displayOrder: 0 },
      { label: 'Gostovanje', url: '/strana/kontakt', displayOrder: 1 },
    ],
  },
  {
    title: 'Fundusi',
    url: '/fundusi',
    displayOrder: 2,
    links: [
      { label: 'Kostimi', url: '/fundusi', displayOrder: 0 },
      { label: 'Rekviziti i scenografija', url: '/fundusi?tab=props', displayOrder: 1 },
    ],
  },
  {
    title: 'O nama',
    url: '/strana/o-nama',
    displayOrder: 3,
    links: [
      { label: 'Mapa objekta', url: '/strana/kontakt#mapa-objekta', displayOrder: 0 },
      { label: 'Vesti', url: '/vesti', displayOrder: 1 },
      { label: 'Kontakt', url: '/strana/kontakt', displayOrder: 2 },
    ],
  },
];

const PUBLIC_FOOTER_NAVIGATION_EN: PublicFooterNavigationGroup[] = [
  {
    title: 'Repertoire',
    url: '/repertoar',
    displayOrder: 0,
    links: [
      { label: 'Drama', url: '/repertoar?group=dramski', displayOrder: 0 },
      { label: 'Music', url: '/repertoar?group=muzicki', displayOrder: 1 },
      { label: 'Guest performances', url: '/repertoar?group=gostovanja', displayOrder: 2 },
    ],
  },
  {
    title: 'Partnership',
    url: '/zakup-prostora',
    displayOrder: 1,
    links: [
      { label: 'Venue rental', url: '/zakup-prostora', displayOrder: 0 },
      { label: 'Guest performance', url: '/strana/kontakt', displayOrder: 1 },
    ],
  },
  {
    title: 'Fundus',
    url: '/fundusi',
    displayOrder: 2,
    links: [
      { label: 'Costumes', url: '/fundusi', displayOrder: 0 },
      { label: 'Props and scenography', url: '/fundusi?tab=props', displayOrder: 1 },
    ],
  },
  {
    title: 'About us',
    url: '/strana/o-nama',
    displayOrder: 3,
    links: [
      { label: 'Location map', url: '/strana/kontakt#mapa-objekta', displayOrder: 0 },
      { label: 'News', url: '/vesti', displayOrder: 1 },
      { label: 'Contact', url: '/strana/kontakt', displayOrder: 2 },
    ],
  },
];

export const PUBLIC_SOCIAL_LINKS: PublicFooterLink[] = [
  { platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/madlenianum/?hl=en', displayOrder: 0 },
  { platform: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@OperaTheatreMadlenianumBeograd/featured', displayOrder: 1 },
  { platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/Madlenianum/', displayOrder: 2 },
];

export function publicFooterNavigation(locale: 'sr' | 'en'): PublicFooterNavigationGroup[] {
  return locale === 'en' ? PUBLIC_FOOTER_NAVIGATION_EN : PUBLIC_FOOTER_NAVIGATION_SR;
}

export function publicLegalLinks(locale: 'sr' | 'en'): PublicFooterLink[] {
  return [
    {
      label: locale === 'en' ? 'Privacy policy' : 'Politika privatnosti',
      url: 'https://www.zepter.rs/rules/privacy-policy',
      displayOrder: 0,
    },
    {
      label: locale === 'en' ? 'Terms of use' : 'Uslovi korišćenja',
      url: 'https://www.zepter.rs/rules/regulation',
      displayOrder: 1,
    },
  ];
}

export const PUBLIC_NAVIGATION: PublicNavigationItem[] = [
  { label: 'Repertoar', path: '/repertoar' },
  { label: 'Umetnici', path: '/umetnici' },
  { label: 'Fundusi', path: '/fundusi' },
  { label: 'Zakup prostora', path: '/zakup-prostora' },
  { label: 'O Madlenianumu', path: '/strana/o-nama' },
  { label: 'Kontakt', path: '/strana/kontakt' },
];

export const PUBLIC_REPERTOIRE_MENU: PublicRepertoireMenuItem[] = [
  {
    label: 'Ceo repertoar',
    path: '/repertoar',
    image: '/uploads/madlenianum/gospodin_u_cizmama_od_dima.jpg',
  },
  {
    label: 'Dramski',
    path: '/repertoar',
    image: '/uploads/madlenianum/gordost_i_predrasude_main.jpg',
    queryParams: { group: 'dramski' },
  },
  {
    label: 'Muzički',
    path: '/repertoar',
    image: '/uploads/madlenianum/pariski_zivotu_u_najavi.jpg',
    queryParams: { group: 'muzicki' },
  },
  {
    label: 'Gostovanja',
    path: '/repertoar',
    image: '/uploads/madlenianum/gostovanja_slika.jpg',
    queryParams: { group: 'gostovanja' },
  },
];

export const PUBLIC_PARTNER_MENU: PublicPartnerMenuItem[] = [
  { label: 'Zepter International', url: 'https://www.zepter.rs/', image: '/madlenianum/brands/ZepterLogo.png' },
  { label: 'Zepter Medical', url: 'https://medicrada.com/', image: '/madlenianum/brands/ZepterMedical.png' },
  { label: 'Zepter Yachts', url: 'https://philipzepteryachts.com/', image: '/madlenianum/brands/ZepterYacths.png' },
  { label: 'Muzej Zepter', url: 'https://zeptermuzej.rs/', image: '/madlenianum/brands/MuzejZepter.png' },
  { label: 'Palata umetnosti Madlena', url: 'https://palataumetnostimadlena.rs/', image: '/madlenianum/brands/PalataUmetnostiMadlena.jpg' },
  { label: 'ZepterMe', url: 'https://zepterme.rs/', image: '/madlenianum/brands/Zepterme.svg' },
  { label: 'Zepter Dental', url: 'https://zepterdental.com/', image: '/madlenianum/brands/zepter dental.png' },
  { label: 'Zepter Hotels', url: 'https://www.hotelzepter.rs/en/', image: '/madlenianum/brands/zepter hotels logo.png' },
];

export const PUBLIC_RENTAL_MENU: PublicRentalMenuItem[] = [
  {
    label: 'Fundusi i rekviziti',
    description: 'Kostimi, scenski rekviziti i scenografija iz fundusa Madlenianuma.',
    path: '/fundusi',
    image: '/madlenianum/fundus_wallpaper.png',
  },
  {
    label: 'Zakup prostora',
    description: 'Sale i reprezentativni prostori za događaje, konferencije i proslave.',
    path: '/zakup-prostora',
    image: '/madlenianum/zakup_prostora/madlenianum_sale_wallpaper.jpg',
  },
];

const PUBLIC_EXACT_ROUTES = new Set([
  '/',
  '/repertoar',
  '/umetnici',
  '/fundusi',
  '/zakup-prostora',
  '/vesti',
  '/strana/o-nama',
  '/strana/kontakt',
  '/porudzbina',
]);

const PUBLIC_ENGLISH_EXACT_ROUTES = new Set([
  '/en',
  '/en/repertoire',
  '/en/artists',
  '/en/fundus',
  '/en/venue-rental',
  '/en/news',
  '/en/about',
  '/en/contact',
  '/en/order',
]);

export function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function isAvailablePublicDestination(value: string): boolean {
  const url = value.trim();
  if (isExternalUrl(url)) {
    return true;
  }

  const path = url.split('?')[0].split('#')[0];

  return PUBLIC_EXACT_ROUTES.has(path)
    || PUBLIC_ENGLISH_EXACT_ROUTES.has(path)
    || /^\/predstave\/[^/]+$/.test(path)
    || /^\/umetnici\/[^/]+$/.test(path)
    || /^\/vesti\/[^/]+$/.test(path)
    || /^\/fundusi\/(kostimi|rekviziti-scenografija)\/[^/]+$/.test(path)
    || /^\/zakup-prostora\/[^/]+$/.test(path)
    || /^\/kupovina\/[^/]+$/.test(path)
    || /^\/porudzbina\/[^/]+$/.test(path)
    || /^\/en\/productions\/[^/]+$/.test(path)
    || /^\/en\/artists\/[^/]+$/.test(path)
    || /^\/en\/news\/[^/]+$/.test(path)
    || /^\/en\/fundus\/(costumes|props-scenography)\/[^/]+$/.test(path)
    || /^\/en\/venue-rental\/[^/]+$/.test(path)
    || /^\/en\/tickets\/[^/]+$/.test(path)
    || /^\/en\/order\/[^/]+$/.test(path);
}
