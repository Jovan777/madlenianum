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

export const PUBLIC_NAVIGATION: PublicNavigationItem[] = [
  { label: 'Repertoar', path: '/repertoar' },
  { label: 'Predstave', path: '/predstave' },
  { label: 'Umetnici', path: '/umetnici' },
  { label: 'O Madlenianumu', path: '/strana/o-nama' },
  { label: 'Kontakt', path: '/strana/kontakt' },
];

export const PUBLIC_REPERTOIRE_MENU: PublicRepertoireMenuItem[] = [
  {
    label: 'Ceo repertoar',
    path: '/repertoar',
    image: '/madlenianum/gospodin_u_cizmama_od_dima.jpg',
  },
  {
    label: 'Dramski',
    path: '/predstave',
    image: '/madlenianum/gordost_i_predrasude_main.jpg',
    queryParams: { group: 'dramski' },
  },
  {
    label: 'Muzički',
    path: '/predstave',
    image: '/madlenianum/pariski_zivotu_u_najavi.jpg',
    queryParams: { group: 'muzicki' },
  },
  {
    label: 'Gostovanja',
    path: '/predstave',
    image: '/madlenianum/gostovanja_slika.jpg',
    queryParams: { group: 'gostovanja' },
  },
];

const PUBLIC_EXACT_ROUTES = new Set([
  '/',
  '/repertoar',
  '/predstave',
  '/umetnici',
  '/strana/o-nama',
  '/strana/kontakt',
  '/porudzbina',
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
    || /^\/predstave\/[^/]+$/.test(url)
    || /^\/umetnici\/[^/]+$/.test(url)
    || /^\/kupovina\/[^/]+$/.test(url)
    || /^\/porudzbina\/[^/]+$/.test(url);
}
