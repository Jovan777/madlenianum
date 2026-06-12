export interface ResourceColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'money' | 'status';
}

export interface ResourceConfig {
  title: string;
  subtitle: string;
  resource: string;
  columns: ResourceColumn[];
  detailRoute?: string;
  query?: string;
}

export const ADMIN_RESOURCE_CONFIGS: Record<string, ResourceConfig> = {
  productions: {
    title: 'Productions',
    subtitle: 'Predstave, opere, drame, baleti, mjuzikli i koncerti.',
    resource: 'productions',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type', type: 'status' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'season', label: 'Season' },
      { key: 'isFeatured', label: 'Featured' },
    ],
  },
  events: {
    title: 'Events',
    subtitle: 'Termini izvođenja, prodaja i ticketing konfiguracija.',
    resource: 'events',
    detailRoute: '/admin/events',
    query: 'limit=200&sort=startsAt',
    columns: [
      { key: 'production.title', label: 'Production' },
      { key: 'venue.name', label: 'Venue' },
      { key: 'startsAt', label: 'Starts at', type: 'date' },
      { key: 'saleStatus', label: 'Sale', type: 'status' },
      { key: 'ticketing.provider', label: 'Provider', type: 'status' },
    ],
  },
  venues: {
    title: 'Venues',
    subtitle: 'Scene i prostori Madlenianuma.',
    resource: 'venues',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'venueType', label: 'Type', type: 'status' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
  },
  'seat-maps': {
    title: 'Seat Maps',
    subtitle: 'Planovi sedišta za scene.',
    resource: 'seat-maps',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'venue.name', label: 'Venue' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'canvas.width', label: 'Canvas W' },
      { key: 'canvas.height', label: 'Canvas H' },
    ],
  },
  seats: {
    title: 'Seats',
    subtitle: 'Sedišta, koordinate i cenovne kategorije.',
    resource: 'seats',
    query: 'isActive=true',
    columns: [
      { key: 'label', label: 'Label' },
      { key: 'section', label: 'Section' },
      { key: 'seatType', label: 'Type', type: 'status' },
      { key: 'priceCategory.code', label: 'Category' },
      { key: 'isSellable', label: 'Sellable' },
    ],
  },
  'price-categories': {
    title: 'Price Categories',
    subtitle: 'Cenovne kategorije sedišta.',
    resource: 'price-categories',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'weight', label: 'Weight' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
  },
  'price-plans': {
    title: 'Price Plans',
    subtitle: 'Cenovnici po tipu predstave, sceni i premijeri.',
    resource: 'price-plans',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'venue.name', label: 'Venue' },
      { key: 'isPremiere', label: 'Premiere' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'currency', label: 'Currency' },
    ],
  },
  orders: {
    title: 'Orders',
    subtitle: 'Porudžbine kupaca i status plaćanja.',
    resource: 'orders',
    detailRoute: '/admin/orders',
    columns: [
      { key: 'orderCode', label: 'Code' },
      { key: 'customerSnapshot.fullName', label: 'Customer' },
      { key: 'event.production.title', label: 'Production' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'totalAmount', label: 'Total', type: 'money' },
    ],
  },
  customers: {
    title: 'Customers',
    subtitle: 'Kupci ulaznica i njihovi profili.',
    resource: 'customers',
    columns: [
      { key: 'fullName', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
  },
  artists: {
    title: 'Artists',
    subtitle: 'Umetnici, glumci, reditelji i saradnici.',
    resource: 'artists',
    columns: [
      { key: 'displayName', label: 'Name' },
      { key: 'professions', label: 'Professions' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'weight', label: 'Weight' },
    ],
  },
  news: {
    title: 'News',
    subtitle: 'Aktuelno, obaveštenja i novosti.',
    resource: 'news',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category', type: 'status' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'publishedAt', label: 'Published', type: 'date' },
    ],
  },
};
