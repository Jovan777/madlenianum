export interface ResourceColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'money' | 'status';
}

export interface ResourceFormField {
  key: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'checkbox'
    | 'date'
    | 'array'
    | 'media-single'
    | 'media-multiple';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string | number | boolean; label: string }>;
  helper?: string;
  mediaKind?: 'image' | 'document' | 'all';
}

export interface ResourceConfig {
  title: string;
  subtitle: string;
  resource: string;
  columns: ResourceColumn[];
  detailRoute?: string;
  editRoute?: string;
  mapRoute?: string;
  query?: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  formFields?: ResourceFormField[];
}

export const PRODUCTION_TYPES = [
  { value: 'opera', label: 'Opera' },
  { value: 'opereta', label: 'Opereta' },
  { value: 'balet', label: 'Balet' },
  { value: 'drama', label: 'Drama' },
  { value: 'mjuzikl', label: 'Mjuzikl' },
  { value: 'koncert', label: 'Koncert' },
  { value: 'gostujuca_predstava', label: 'Gostujuća predstava' },
  { value: 'ostalo', label: 'Ostalo' },
];

export const PUBLISH_STATUSES = [
  { value: 'draft', label: 'Nacrt' },
  { value: 'published', label: 'Objavljeno' },
  { value: 'archived', label: 'Arhivirano' },
];

export const ACTIVE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const ADMIN_RESOURCE_CONFIGS: Record<string, ResourceConfig> = {
  productions: {
    title: 'Productions',
    subtitle: 'Predstave, opere, drame, baleti, mjuzikli i koncerti.',
    resource: 'productions',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type', type: 'status' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'season', label: 'Season' },
      { key: 'isFeatured', label: 'Featured' },
    ],
    formFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'select', required: true, options: PRODUCTION_TYPES },
      { key: 'authorComposer', label: 'Author / composer', type: 'text' },
      { key: 'originalTitle', label: 'Original title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'shortDescription', label: 'Short description', type: 'textarea' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'synopsis', label: 'Synopsis', type: 'textarea' },
      { key: 'durationMinutes', label: 'Duration minutes', type: 'number' },
      { key: 'season', label: 'Season', type: 'text', placeholder: '2025/2026' },
      { key: 'tags', label: 'Tags', type: 'array', helper: 'Comma separated values.' },
      { key: 'status', label: 'Status', type: 'select', options: PUBLISH_STATUSES },
      { key: 'isFeatured', label: 'Featured', type: 'checkbox' },
    ],
  },
  events: {
    title: 'Events',
    subtitle: 'Termini izvođenja, prodaja i ticketing konfiguracija.',
    resource: 'events',
    detailRoute: '/admin/events',
    editRoute: '/admin/events',
    query: 'limit=200&sort=startsAt',
    canCreate: true,
    canEdit: true,
    canDelete: true,
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
    canCreate: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'venueType', label: 'Type', type: 'status' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'venueType', label: 'Type', type: 'select', options: [
        { value: 'stage', label: 'Stage' },
        { value: 'hall', label: 'Hall' },
        { value: 'foyer', label: 'Foyer' },
        { value: 'other', label: 'Other' },
      ] },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'hasNumberedSeats', label: 'Has numbered seats', type: 'checkbox' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'images', label: 'Venue images', type: 'media-multiple', mediaKind: 'image' },
      { key: 'status', label: 'Status', type: 'select', options: PUBLISH_STATUSES },
    ],
  },
  'seat-maps': {
    title: 'Seat Maps',
    subtitle: 'Planovi sedišta za scene. Za bolji prikaz koristi Map action.',
    resource: 'seat-maps',
    mapRoute: '/admin/seat-maps',
    canCreate: false,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'venue.name', label: 'Venue' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'canvas.width', label: 'Canvas W' },
      { key: 'canvas.height', label: 'Canvas H' },
    ],
    formFields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'draft', label: 'Draft' },
        { value: 'active', label: 'Active' },
        { value: 'archived', label: 'Archived' },
      ] },
    ],
  },
  seats: {
    title: 'Seats',
    subtitle: 'Sedišta su sada bolje dostupna kroz Seat Map prikaz, ne samo kao tabela.',
    resource: 'seats',
    query: 'isActive=true',
    canCreate: false,
    canEdit: false,
    canDelete: false,
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
    canCreate: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    formFields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ACTIVE_STATUSES },
    ],
  },
  'price-plans': {
    title: 'Price Plans',
    subtitle: 'Cenovnici po tipu predstave, sceni i premijeri.',
    resource: 'price-plans',
    canCreate: true,
    canEdit: true,
    canDelete: false,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'venue.name', label: 'Venue' },
      { key: 'isPremiere', label: 'Premiere' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'currency', label: 'Currency' },
    ],
  },
  pages: {
    title: 'Pages',
    subtitle: 'Statične i informativne stranice javnog sajta.',
    resource: 'pages',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'pageType', label: 'Type', type: 'status' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    formFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'pageType', label: 'Page type', type: 'select', options: [
        { value: 'about', label: 'About' },
        { value: 'contact', label: 'Contact' },
        { value: 'ticket_terms', label: 'Ticket terms' },
        { value: 'how_to_buy', label: 'How to buy' },
        { value: 'press', label: 'Press' },
        { value: 'custom', label: 'Custom' },
      ] },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'image', label: 'Main image', type: 'media-single', mediaKind: 'image' },
      { key: 'gallery', label: 'Image gallery', type: 'media-multiple', mediaKind: 'image' },
      { key: 'attachments', label: 'PDF attachments', type: 'media-multiple', mediaKind: 'document' },
      { key: 'status', label: 'Status', type: 'select', options: PUBLISH_STATUSES },
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
    canCreate: false,
    canEdit: true,
    canDelete: false,
    columns: [
      { key: 'fullName', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    formFields: [
      { key: 'fullName', label: 'Full name', type: 'text', required: true },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'postalCode', label: 'Postal code', type: 'text' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'country', label: 'Country', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'newsletterConsent', label: 'Newsletter consent', type: 'checkbox' },
      { key: 'language', label: 'Language', type: 'select', options: [
        { value: 'sr', label: 'Serbian' },
        { value: 'en', label: 'English' },
      ] },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' },
        { value: 'blocked', label: 'Blocked' },
      ] },
    ],
  },
  artists: {
    title: 'Artists',
    subtitle: 'Umetnici, glumci, reditelji i saradnici.',
    resource: 'artists',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'displayName', label: 'Name' },
      { key: 'professions', label: 'Professions' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    formFields: [
      { key: 'displayName', label: 'Display name', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'professions', label: 'Professions', type: 'array', helper: 'Comma separated values.' },
      { key: 'biography', label: 'Biography', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: PUBLISH_STATUSES },
    ],
  },
  news: {
    title: 'News',
    subtitle: 'Aktuelno, obaveštenja i novosti.',
    resource: 'news',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category', type: 'status' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'publishedAt', label: 'Published', type: 'date' },
    ],
    formFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'category', label: 'Category', type: 'select', options: [
        { value: 'vest', label: 'Vest' },
        { value: 'kritika', label: 'Kritika' },
        { value: 'press', label: 'Press' },
        { value: 'akcija', label: 'Akcija' },
        { value: 'premijera', label: 'Premijera' },
        { value: 'ostalo', label: 'Ostalo' },
      ] },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'image', label: 'Main image', type: 'media-single', mediaKind: 'image' },
      { key: 'gallery', label: 'Image gallery', type: 'media-multiple', mediaKind: 'image' },
      { key: 'attachment', label: 'PDF attachment', type: 'media-single', mediaKind: 'document' },
      { key: 'publishedAt', label: 'Published at', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: PUBLISH_STATUSES },
      { key: 'isFeatured', label: 'Featured', type: 'checkbox' },
    ],
  },
  'promo-slides': {
    title: 'Promo slides',
    subtitle: 'Slajdovi i glavne vizuelne poruke javnog sajta.',
    resource: 'promo-slides',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'language', label: 'Language', type: 'status' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'createdAt', label: 'Created', type: 'date' },
    ],
    formFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'image', label: 'Slide image', type: 'media-single', mediaKind: 'image' },
      { key: 'linkLabel', label: 'Link label', type: 'text' },
      { key: 'linkUrl', label: 'Link URL', type: 'text' },
      { key: 'language', label: 'Language', type: 'select', options: [
        { value: 'sr', label: 'Serbian' },
        { value: 'en', label: 'English' },
        { value: 'und', label: 'Not specified' },
      ] },
      { key: 'status', label: 'Status', type: 'select', options: PUBLISH_STATUSES },
    ],
  },
};
