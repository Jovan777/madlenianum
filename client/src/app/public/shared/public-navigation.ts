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

export const PUBLIC_NAVIGATION: PublicNavigationItem[] = [
  { label: 'Repertoar', path: '/repertoar' },
  { label: 'Predstave', path: '/predstave' },
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
  '/predstave',
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
  '/en/productions',
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

  return PUBLIC_EXACT_ROUTES.has(url)
    || PUBLIC_ENGLISH_EXACT_ROUTES.has(url)
    || /^\/predstave\/[^/]+$/.test(url)
    || /^\/umetnici\/[^/]+$/.test(url)
    || /^\/vesti\/[^/]+$/.test(url)
    || /^\/fundusi\/(kostimi|rekviziti-scenografija)\/[^/]+$/.test(url)
    || /^\/zakup-prostora\/[^/]+$/.test(url)
    || /^\/kupovina\/[^/]+$/.test(url)
    || /^\/porudzbina\/[^/]+$/.test(url)
    || /^\/en\/productions\/[^/]+$/.test(url)
    || /^\/en\/artists\/[^/]+$/.test(url)
    || /^\/en\/news\/[^/]+$/.test(url)
    || /^\/en\/fundus\/(costumes|props-scenography)\/[^/]+$/.test(url)
    || /^\/en\/venue-rental\/[^/]+$/.test(url)
    || /^\/en\/tickets\/[^/]+$/.test(url)
    || /^\/en\/order\/[^/]+$/.test(url);
}
