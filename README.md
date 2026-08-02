# Madlenianum

MEAN-style application with an Angular frontend in `client` and an Express/Mongoose backend in `server`. The repository root is not an npm workspace; install dependencies separately in `client` and `server`.

## Prerequisites

- Node.js `24.15+` is recommended. Angular 22 also supports Node.js `22.22.3+` in the Node 22 line.
- npm `8+` (the project is currently developed with npm 11).
- MongoDB available locally or through a configured connection string.

## Backend environment

Copy `server/.env.example` to `server/.env` and replace local secrets as needed:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/madlenianum
CLIENT_URL=http://localhost:4200

JWT_SECRET=replace_with_a_long_random_value
JWT_EXPIRES_IN=7d

UPLOAD_DIR=uploads
MEDIA_UPLOAD_SUBDIR=madlenianum/media
MEDIA_MAX_FILE_SIZE_MB=10

ADMIN_USERNAME=mdleditor
ADMIN_EMAIL=marketing@madlenianum.rs
ADMIN_PASSWORD=Admin123!
```

Never commit `server/.env` or real production credentials.

## Repository-managed media files

Production media is stored below `server/uploads/madlenianum` and is intentionally
versioned with the project. Render serves these files through `/uploads/*`; content
seeds create or update the matching MongoDB Media records without duplicating the
physical files.

The production media workflow is:

1. Add an image or PDF locally through the Media Library, or place it in the correct
   `server/uploads/madlenianum` directory.
2. Verify the Media record and all content references locally.
3. Commit the physical file together with the related source/seed changes.
4. Redeploy Render so the file becomes part of the immutable deploy artifact.

Free Render filesystems are ephemeral. An upload performed directly against the
deployed admin can disappear after a restart or redeploy and cannot write itself
back into Git. Production editors must therefore use the local-and-redeploy workflow.

## Backend setup

```powershell
cd C:\Zepter\Madlenianum\server
npm install
npm run seed:admin
npm run seed:phase2a
npm run seed:content
npm run dev
```

The mandatory seed order is:

1. `seed:admin` creates or resets the local administrator.
2. `seed:phase2a` creates base venues, seat maps, seats, price categories, price plans, production, and event data.
3. `seed:content` creates or updates public content, artists, media records, future demo events, static pages, and deterministic demo orders.

`seed:phase3a` is an alias for `seed:content`. Use one name, not both, during setup.

`seed:remove-weight` is an optional one-time legacy database migration. It removes obsolete `weight` properties from databases created before that field was removed. It is not required for a fresh database and is not part of the normal seed sequence.

The backend runs at `http://localhost:5000`.

## Frontend setup

The API and media origins are centralized in `client/src/environments/environment.ts`.
Local development uses `http://localhost:5000`. A Vercel build reads the Render
origin from `MADLENIANUM_API_ORIGIN` and writes it to the generated browser runtime
configuration.

```powershell
cd C:\Zepter\Madlenianum\client
npm install
npm start
```

The frontend runs at `http://localhost:4200`.

## Local admin

- Login: `http://localhost:4200/admin/login`
- Media Library: `http://localhost:4200/admin/media`
- Local test email: `marketing@madlenianum.rs`
- Local test password: `Admin123!`

These credentials are for local development only.

## Media Library

Authenticated administrators can upload images and PDF documents, browse/search/filter existing media, edit metadata, preview files, and select media from content forms.

Allowed uploads:

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WEBP (`.webp`)
- GIF (`.gif`)
- PDF (`.pdf`)

Video upload is not supported. The default limit is 10 MB per file and can be changed with `MEDIA_MAX_FILE_SIZE_MB`. New uploads are stored below `server/uploads/madlenianum/media`; existing `/uploads/madlenianum/...` URLs remain valid.

On the free Render deployment, use uploads only during local content preparation.
Commit every approved file under `server/uploads/madlenianum` before deployment.

Deletion is blocked when a Media record is referenced by a production, artist, news article, promo slide, static page, or venue. Unused managed files are deleted from both MongoDB and local storage.

## Content CMS

The authenticated admin CMS manages Productions, Artists, News, structured About and Contact pages, homepage editorial selection, global Site Settings, Promo Slides, and the existing Media Library. Production remains editorial content; Events remain dated performances with ticketing configuration.

Main Angular admin routes:

- `/admin/productions`, `/admin/productions/new`, `/admin/productions/:id/edit`, `/admin/productions/:id/preview`
- `/admin/artists`, `/admin/artists/new`, `/admin/artists/:id/edit`, `/admin/artists/:id/preview`
- `/admin/news`, `/admin/news/new`, `/admin/news/:id/edit`, `/admin/news/:id/preview`
- `/admin/pages`, `/admin/pages/about`, `/admin/pages/about/preview`, `/admin/pages/contact`, `/admin/pages/contact/preview`
- `/admin/homepage`, `/admin/homepage/preview`, `/admin/site-settings`
- `/admin/promo-slides`, `/admin/promo-slides/new`, `/admin/promo-slides/:id/edit`, `/admin/promo-slides/:id/preview`, `/admin/media`

New editorial content starts as `draft`. Normal public APIs return only `published` records whose `publishedAt` is empty or not in the future. `archived` records remain available to administrators but are removed from public responses. Preview endpoints are below `/api/admin` and require an admin bearer token; they return the last saved version with `noindex,nofollow` metadata. Preview does not publish unsaved browser changes.

Production, Artist, News, StaticPage, and PromoSlide use consistent status, SEO, publishing, and optional audit fields. Slugs are generated when omitted, remain manually editable, and are unique. Changing a published slug can break existing links because redirects are not part of this phase.

Rich editorial HTML is sanitized by `sanitize-html` on the backend with an explicit allowlist for paragraphs, headings, emphasis, lists, blockquotes, links, and line breaks. Scripts, event handlers, arbitrary iframes, and unsupported markup are removed. Production video entries accept YouTube, Vimeo, or explicitly labelled external HTTP/HTTPS links; no video files or pasted embed HTML are accepted.

Structured galleries use Media Library references plus caption, credit, alt text, and `displayOrder`. Legacy `gallery` arrays remain readable during transition. New editors write `galleryItems`, and used Media remains protected from deletion across structured sections, video thumbnails, announcement images, homepage configuration, and Site Settings.

About and Contact are controlled `StaticPage` types. `HomepageConfig` and `SiteSettings` are singleton documents with the immutable key `default`; their services create the default document only when it is missing, while the content seed upserts that same key. Do not create these records directly from application code.

Prefer Archive over Delete for editorial records. Production deletion is blocked by Events or recommendations, Artist deletion is blocked by cast or creative-team usage, structured About/Contact pages cannot be deleted, and referenced Media cannot be deleted. Conflict responses use HTTP `409` and include usage details where available.

## Structured content migration

Databases created before the structured CMS can migrate legacy galleries, videos, and production credits with:

```powershell
cd C:\Zepter\Madlenianum\server
npm run migrate:structured-content
```

The migration is idempotent and skips already migrated fields. It is optional for existing databases and intentionally not part of the mandatory fresh-install seed sequence. Keep legacy gallery/video fields until all environments have been migrated and downstream clients no longer consume them.

Authenticated CMS API smoke checks can be run while the backend is running:

```powershell
cd C:\Zepter\Madlenianum\server
npm run test:cms
```

The script creates uniquely named temporary records, checks draft/public visibility, sanitization, validation, preview protection, publishing, archiving, scheduled News, singleton identity, and deletion conflicts, then removes its temporary records.

## Event and pricing configuration migration

Databases that contain Events with legacy `finished`, `not_on_sale`, or `sales_closed` values, or Price Plans created before revision metadata was added, can be normalized with:

```powershell
cd C:\Zepter\Madlenianum\server
npm run migrate:phase4a-ticketing
```

This migration is idempotent. It normalizes legacy statuses and Price Plan revisions, and repairs legacy OrderItem seat references only when the Event SeatMap contains exactly one seat with the stored historical seat label. It never changes OrderItem price snapshots. The migration is optional for existing databases, must be reviewed before use against production data, and is intentionally not part of the mandatory fresh-install seed sequence.

The Event and pricing smoke checks create and remove temporary records while validating compatibility rules, history protection, duplication/versioning, operational statistics, and existing public repertoire/ticketing routes:

```powershell
cd C:\Zepter\Madlenianum\server
npm run test:phase4a
```

## Seat maps and Event seat overrides

`SeatMap` and `Seat` represent the permanent physical layout of a venue. Seat identity is stable: layout updates change the existing Seat documents instead of deleting and recreating them. Event-only restrictions such as protocol, VIP, guest, production use, box-office-only, blocked, and temporarily unavailable seats are stored in `EventSeatOverride`.

Authenticated admin routes include:

- `/api/admin/seat-maps/:id/preview`
- `/api/admin/seat-maps/:id/seats/bulk`
- `/api/admin/seat-maps/:id/duplicate`
- `/api/admin/events/:id/seat-overrides`
- `/api/admin/events/:id/seat-map-preview`
- `/api/admin/events/:id/seat-overrides/bulk`

The Angular administration routes are `/admin/seat-maps`, `/admin/seat-maps/:id/edit`, `/admin/seat-maps/:id/preview`, and `/admin/events/:id/seat-overrides`.

Effective Event seat availability is calculated centrally. Permanent physical unavailability wins first, sold and reserved OrderItems remain authoritative, Event overrides are then applied, active locks follow, and all remaining active seats are available. Expired locks and cancelled Orders do not block seats. Public APIs expose only safe effective states and never return internal override reasons or administrator audit fields.

The base seed preserves existing Seat IDs while updating the demo Parter and Galerija coordinates. The content seed idempotently adds a small set of realistic Event overrides. No Phase 4B migration is required because the audited data model did not contain legacy Event-specific state on Seat documents.

Phase 4B smoke checks cover stable Seat IDs, layout validation, protected structural changes, map duplication, bulk overrides, public-state privacy, Order/lock precedence, and existing Event configuration:

```powershell
cd C:\Zepter\Madlenianum\server
npm run test:phase4a
npm run test:phase4b
```

## Build and verification

```powershell
cd C:\Zepter\Madlenianum\client
npm run build
```

If PowerShell blocks the `npm.ps1` shim, use `npm.cmd` for the same commands.

## Ticketing, Orders and inquiries

Public visitors never create accounts. Seat selection, locking, reservation, pending purchase and secure Order review are guest-based. Prices are recalculated from the Event's stored PricePlan on the backend; Angular totals are display-only. Reservations and pending-payment Orders expire, while genuinely paid OrderItems remain sold. Confirmation email failure is recorded without rolling back the business transaction.

Fundus is a read-only public catalogue. RentalSpace and Event Planning submissions are non-binding inquiries and do not create theatre Events, Orders or reservations.

## Security and production checks

The backend uses an exact CORS allowlist, Helmet headers, configurable request/upload limits, endpoint-specific rate limits, rich-text sanitization, upload content-signature checks, safe production errors, admin activity audit records, readiness checks and SIGTERM/SIGINT cleanup.

Run the complete backend checks against a disposable development/test database:

```powershell
cd C:\Zepter\Madlenianum\server
npm run test:cms
npm run test:phase4a
npm run test:phase4b
npm run test:ticketing-flow
npm run test:phase5
npm run test:phase6a
npm run test:localization
npm run test:phase7
npm run validate:indexes
npm run test:production-startup
```

Frontend checks:

```powershell
cd C:\Zepter\Madlenianum\client
npm run test:i18n
npm test -- --watch=false
npm run build
```

Detailed operational references:

- [API route inventory](docs/API_ROUTE_INVENTORY.md)
- [Manual test matrix](docs/MANUAL_TEST_MATRIX.md)
- [Atlas, Render and Vercel readiness](docs/DEPLOYMENT_READINESS.md)

Development seeds are idempotent but may update existing demo records and reset the configured development administrator password. They must never be part of production startup. Production initialization consists of environment configuration, reviewed optional migrations and index validation; it must not wipe or overwrite data.
