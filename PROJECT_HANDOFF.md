# Madlenianum Technical Handoff

Prepared from the actual repository state on 2026-07-22. This document is the only repository file changed while preparing the handoff. No source code, database data, Git history, seeds, or migrations were changed.

## 1. Project Overview

Madlenianum is a MEAN-style content-management and guest ticketing application for an opera and theatre institution. It contains a public cultural programme, production and artist content, repertoire browsing, seat selection and guest orders, plus an administrator-only CMS and operational panel.

### Technology and structure

- `C:\Zepter\Madlenianum\client`: Angular 22 standalone-component frontend, TypeScript, RxJS, Angular Router, Reactive Forms, and SCSS.
- `C:\Zepter\Madlenianum\server`: Node.js/Express backend, Mongoose, MongoDB, JWT administrator authentication, bcrypt password hashing, Multer uploads, and explicit controllers/routes.
- `C:\Zepter\Madlenianum\README.md`: local setup and project notes.
- This is not an npm workspace. Install and run `client` and `server` separately.
- MongoDB database: `madlenianum`.
- Backend default URL: `http://localhost:5000`.
- Frontend default URL: `http://localhost:4200`.
- Frontend API base: `http://localhost:5000/api`.

### Authentication and ticketing model

- Only administrators have accounts. Admin login uses email and password and returns a JWT.
- Public users do not register, log in, or have profiles.
- Public seat selection, temporary reservation, checkout, and order lookup are guest-based and use a browser-generated session ID plus a guest contact snapshot.
- Purchase confirmation is currently an unpaid reservation/order stored in MongoDB. A payment provider is not integrated.
- Confirmation messages will later be delivered by email; email delivery is not implemented yet.
- A legacy `Customer` model and `/api/customer` authentication routes still exist in the backend, but the current Angular public application does not use them. They must not be expanded or exposed as the public product model.

### Media storage

- Uploaded files are stored on the server filesystem under `server/uploads` and served from `/uploads`.
- Managed Media Library files default to `server/uploads/madlenianum/media/images` or `documents`.
- `UPLOAD_DIR`, `MEDIA_UPLOAD_SUBDIR`, and `MEDIA_MAX_FILE_SIZE_MB` can configure storage; the latter two currently rely on defaults when absent from `.env`.
- MongoDB `Media` records store metadata and the public URL/storage path.
- The Angular `MediaUrlService` resolves backend media URLs centrally. Templates should not concatenate backend hosts manually.
- Demo content images are copied/seeded from `client/public/madlenianum` into `server/uploads/madlenianum` by the content seed workflow.

## 2. Current Git State

### Inspection baseline before creating this document

- Branch: `develop`.
- Upstream: `origin/develop`.
- HEAD: `e58300d45cd22fbffbaef6923e9aeb22627e188f` (`fixed production upload`).
- `git status --short --branch`: `## develop...origin/develop`.
- `git status --short`: empty.
- `git diff --stat`: empty.
- `git diff --name-status`: empty.
- Untracked files: none.
- Modified files: none.
- Deleted files: none.
- Baseline working tree: clean.
- Incomplete uncommitted implementation: none found.

### State after this handoff was created

The only expected working-tree change is the untracked documentation file:

```text
?? PROJECT_HANDOFF.md
```

`git diff --stat` remains empty because Git does not include untracked files in a normal diff. No implementation file is modified. Do not reset, restore, or discard this handoff file before the next session reads it.

### Recent implementation commits

- `e58300d` fixed blank cast/creative-team artist references when saving a Production.
- `c25be48` implemented the Figma-oriented public Production detail screen.
- `0c56940` implemented the Figma-oriented Repertoire views.
- `dedca57` implemented the Figma-oriented homepage.
- `813a42e` implemented the Phase 2 CMS foundation and publishing workflow.
- `7a812ac` implemented the Phase 1 Media system.
- `8cf27bf` fixed dynamic demo event dates and public ticketing availability.

The work represented by these commits is committed and no partially edited phase remains in the working tree. Build/API/browser verification performed for this handoff is recorded in section 8.

## 3. Completed Phases

### Phase 1: cleanup and Media Library

Fully completed:

- Removed obsolete frontend backup trees and old testing README artifacts.
- Added a Mongoose `Media` model and explicit Media admin API.
- Added secure local upload handling for JPG, PNG, WEBP, GIF, and PDF, with a 10 MB default limit.
- Added single and multiple upload, filtering, search, metadata editing, preview, and pagination.
- Added Media Library and reusable Media Picker admin UI.
- Integrated the picker into Production, Artist, News, Promo Slide, Static Page, and Venue forms where supported.
- Added usage discovery and conflict-aware deletion. Used media returns a conflict instead of being silently deleted.
- Centralized public/admin media URL resolution.

Intentionally deferred:

- External/object storage and image transformation/CDN support.
- Automated orphan-file reconciliation.

### Phase 2: structured CMS and publishing

Fully completed:

- Dedicated Production, Artist, News, and Promo Slide CMS list/form/preview screens.
- Structured Production galleries, videos/trailers, creative team, cast, reviews, recommendations, and editorial fields.
- Structured Artist professions, biography, image, links, status, SEO, and related-production DTO data.
- News categories, rich content, related Production, media, scheduling, and SEO.
- Structured About and Contact editing through `StaticPage` records.
- Singleton `HomepageConfig` and `SiteSettings` admin screens and APIs.
- Publishing states, scheduling windows, draft/archive public protection, audit fields, SEO fields, and sanitized rich-text handling.
- Public DTO/mapping layer that avoids returning raw Mongoose documents and internal audit/storage fields.
- Preview endpoints/screens for dedicated CMS content.
- Legacy gallery/video/credit compatibility and a structured-content migration path.
- Conflict-aware Production and Artist deletion where referenced.

Partially completed:

- Legacy fields remain readable for migration compatibility; they have not all been physically removed from old records.
- Rich text is structured for future editor replacement, but current admin editing remains practical textarea/form input rather than a final rich-text product.

Intentionally deferred:

- Event-specific cast overrides.
- Multilingual public switching, despite translation-ready fields/settings.

### Phase 3: public experience

Fully completed:

- Shared public header, desktop navigation dropdown, responsive mobile navigation, active-route behavior, and keyboard/Escape handling.
- Public homepage integrated with `HomepageConfig`, `SiteSettings`, Promo Slides, Events, Productions, News, About content, and configured CTA cards.
- Hero slider, upcoming Events, Production-based repertoire section, featured section, safe video modal, News section, institutional teaser, CTA cards, and dynamic footer.
- Public Repertoire with `Aktuelno`, `U najavi`, and `Arhiva` views, relevant filters, ticket actions, and CMS/API data.
- Public Production detail with hero, synopsis, facts, upcoming performances, gallery, cast, and trailer behavior.
- Responsive layout and loading/empty/error behavior for the principal Phase 3 screens.
- No public account, registration, profile, or fake language UI.

Partially completed:

- Homepage, Repertoire, and Production detail are the Phase 3 Figma implementations and may still need final pixel/content QA, but are not placeholder screens.
- Public Productions, Artists, Artist detail, About/Contact, ticketing, and order lookup remain functional and responsive but have not all received equivalent final Figma treatment.
- Homepage News cards can link to a related Production, but the Angular app has no dedicated public News route even though the backend exposes News endpoints.

Intentionally deferred:

- Fundus and venue-rental modules do not exist. No dead public routes were created.
- Configured generic CTA cards render only with allowed working internal destinations or valid external URLs. Current demo rental/fundus-adjacent cards route to Contact rather than nonexistent modules.
- The account-based ZepterClub block shown in the source design was intentionally omitted.

## 4. Current Screen and Component Map

The route source of truth is `client/src/app/app.routes.ts`.

### Admin routes and files

- `/admin/login`: `client/src/app/admin/pages/admin-login/admin-login.component.{ts,html,scss}`.
- `/admin`: dashboard in `client/src/app/admin/pages/admin-dashboard/admin-dashboard.component.{ts,html,scss}`.
- Admin shell/navigation: `client/src/app/admin/layout/admin-layout/admin-layout.component.{ts,html,scss}`.
- `/admin/media`: `client/src/app/admin/pages/admin-media-library/admin-media-library.component.{ts,html,scss}`; picker in `client/src/app/admin/components/admin-media-picker/`.
- `/admin/events`, `/admin/events/:id`, `/new`, `/:id/edit`: list through the configured resource list, with dedicated detail/form in `client/src/app/admin/pages/admin-event-detail/` and `admin-event-form/`.
- `/admin/productions`, `/new`, `/:id/edit`, `/:id/preview`: dedicated components in `client/src/app/admin/pages/admin-production-list/`, `admin-production-form/`, and `admin-production-preview/`.
- `/admin/artists`, `/new`, `/:id/edit`, `/:id/preview`: `admin-artist-list/`, `admin-artist-form/`, and `admin-artist-preview/`.
- `/admin/news`, `/new`, `/:id/edit`, `/:id/preview`: `admin-news-list/`, `admin-news-form/`, and `admin-news-preview/`.
- `/admin/promo-slides`, `/new`, `/:id/edit`, `/:id/preview`: `admin-promo-slide-list/`, `admin-promo-slide-form/`, and `admin-promo-slide-preview/`.
- `/admin/pages/about` and preview: `admin-about-form/` and `admin-static-page-preview/`.
- `/admin/pages/contact` and preview: `admin-contact-form/` and `admin-static-page-preview/`.
- `/admin/homepage` and preview: `admin-homepage-config/` and `admin-homepage-preview/`.
- `/admin/site-settings`: `client/src/app/admin/pages/admin-site-settings/`.
- `/admin/venues`: generic explicit resource configuration rendered by `admin-resource-list/` and `admin-resource-form/`.
- `/admin/seat-maps`: generic list/form; visual map route `/admin/seat-maps/:id/map` uses `admin-seat-map-designer/`.
- `/admin/price-plans`: list plus dedicated create/edit `admin-price-plan-form/`.
- `/admin/price-categories`: generic resource list/form.
- `/admin/orders`: list; `/admin/orders/:id` uses `admin-order-detail/`.
- `/admin/system`: `admin-system-status/`.

Shared admin services are under `client/src/app/core/services`: `auth.service.ts`, `admin-api.service.ts`, `cms-admin.service.ts`, and `admin-media.service.ts`. Auth guard/interceptor are under `client/src/app/core/guards` and `client/src/app/core/interceptors`.

The dedicated Phase 2 Production/Artist/News/Promo/Page/Homepage/SiteSettings components replaced generic CMS editing for those routes. Generic resource list/form components remain intentionally for operational resources. Removed older artifacts were backup/test directories, not an alternative live application.

### Public routes and files

- `/`: `client/src/app/public/pages/public-home/`; section components are under `client/src/app/public/components/` (`public-hero-slider`, `public-upcoming-events`, `public-repertoire-section`, `public-featured-section`, `public-news-section`, `public-institutional-teaser`, `public-cta-cards`, and `public-video-modal`).
- `/repertoar`: `client/src/app/public/pages/public-repertoire/`; cards under `public/components/public-repertoire-*`.
- `/predstave`: `client/src/app/public/pages/public-productions/`.
- `/predstave/:slug`: `client/src/app/public/pages/public-production-detail/`.
- `/umetnici`: `client/src/app/public/pages/public-artists/`.
- `/umetnici/:slug`: `client/src/app/public/pages/public-artist-detail/`.
- `/strana/:slug`: `client/src/app/public/pages/public-static-page/`, used for About and Contact.
- `/kupovina/:eventId`: `client/src/app/public/pages/public-ticketing/`.
- `/porudzbina` and `/porudzbina/:identifier`: `client/src/app/public/pages/public-order-lookup/`.
- Shared shell: `client/src/app/public/layout/public-layout/`, `public/components/public-header/`, and `public/components/public-footer/`.
- Public API/DTOs: `client/src/app/core/services/public-api.service.ts` and `client/src/app/core/models/public.models.ts`.
- Central labels/date/type grouping: `client/src/app/public/shared/public-display.service.ts`.
- Allowed public destinations/navigation: `client/src/app/public/shared/public-navigation.ts`.

There is no Angular public News list/detail route at present. The backend News endpoints exist, so a new session must not assume the absence of a frontend route means the CMS or API is missing.

## 5. Backend Architecture

### Important models

- `server/src/models/AdminUser.js`: administrator identity, explicitly stored in `adminusers`; `passwordHash` is excluded by default and selected for login.
- `Media.js`: uploaded-file metadata and storage/public URL information.
- `Production.js`: editorial production content, media, structured gallery/video/credits/cast/reviews/recommendations, announcement, publishing, and SEO.
- `Artist.js`: artist identity, professions, biography, media, links, publishing, and SEO.
- `News.js`: editorial News, category, content, media, publication schedule, relation, and SEO.
- `PromoSlide.js`: homepage hero slide with production/event links and active/publication windows.
- `StaticPage.js`: structured About, Contact, and custom pages.
- `HomepageConfig.js`: singleton homepage selection/mode/limit/section/CTA configuration.
- `SiteSettings.js`: singleton logos, contact, footer groups, social/legal/partner data, languages, and default SEO.
- `Venue.js`: physical venue and section metadata.
- `Event.js`: concrete scheduled performance, sale/ticketing configuration, venue, SeatMap, and PricePlan.
- `SeatMap.js`: permanent physical map/canvas/section structure.
- `Seat.js`: permanent seat number/row/section/coordinates/category/sellability.
- `PricePlan.js`: currency and category-price rules, applicability, validity, and status.
- `PriceCategory.js`: reusable named/code price category.
- `SeatLock.js`: temporary event-seat lock owned by a guest session/customer, with expiry/state.
- `Order.js`: event order, optional legacy customer, guest contact snapshot, session, total, status, and payment state.
- `OrderItem.js`: immutable historical seat/category/price snapshots for an order.
- `Customer.js`: legacy/dormant account model; not the intended public-user model.
- `ContactMessage.js` and `NewsletterSubscriber.js`: public submissions.

There is no `EventSeatOverride` model.

### Controllers, routes, and services

- Server composition: `server/src/index.js`.
- Controllers: `server/src/controllers/*.controller.js`; key files include `auth.controller.js`, `public.controller.js`, `ticketingPublic.controller.js`, `event.controller.js`, `production.controller.js`, `artist.controller.js`, `news.controller.js`, `promoSlide.controller.js`, `staticPage.controller.js`, `homepageConfig.controller.js`, `siteSettings.controller.js`, `media.controller.js`, `pricePlan.controller.js`, `priceCategory.controller.js`, `seatMap.controller.js`, `seat.controller.js`, `adminOrder.controller.js`, `adminSystem.controller.js`, and `adminFormOptions.controller.js`.
- Route modules: `server/src/routes/*.routes.js`; root mounts are `/api/admin`, `/api/public`, and legacy `/api/customer`.
- Public DTO mapping: `server/src/services/cmsDto.service.js`.
- CMS population: `server/src/services/cmsPopulate.service.js`.
- Publishing/pagination/error helpers: `server/src/services/cms.service.js`.
- Homepage selection/resolution: `server/src/services/homepage.service.js`.
- Rich-text sanitization: `server/src/services/richText.service.js`.
- Structured video parsing: `server/src/services/video.service.js`.
- Media reference discovery: `server/src/services/mediaUsage.service.js`.
- Local storage: `server/src/services/localMediaStorage.service.js`.
- Singleton settings handling: `server/src/services/siteSettings.service.js`.
- Upload policy: `server/src/config/media.config.js` and `server/src/middleware/upload.middleware.js`.
- Admin auth middleware: `server/src/middleware/auth.middleware.js`.
- Structured-content migration: `server/src/migration/migrateStructuredContent.js`.
- Obsolete field cleanup: `server/src/seed/removeWeightFields.seed.js`.

Admin auth routes are mounted before `router.use(protectAdmin)` in `server/src/routes/admin.routes.js`. Login is public; all subsequent admin resources and `/auth/me` are protected.

## 6. API Map

### Administrator API

Prefix: `/api/admin`. Authentication: Bearer JWT for every endpoint except login.

- `POST /auth/login`: accepts `{ email, password }`; returns `{ success, token, admin: { id, username, email, role, language } }`. It updates `lastLoginAt`.
- `GET /auth/me`: returns the authenticated admin.
- `/media`: paginated/searchable list, multipart single/multiple upload, detail/update/delete, and `/:id/usage`. A used file returns HTTP 409 on deletion.
- `/productions`, `/artists`, `/news`, `/promo-slides`, `/pages`: explicit list/create/detail/update/delete plus preview/archive where applicable. Lists support resource-specific status/search/filter/pagination query parameters.
- `/pages/structured/:pageType`: About/Contact structured get/update/preview.
- `/homepage-config`: singleton get/update/preview.
- `/site-settings`: singleton get/update.
- `/events`: list supports `production`, `venue`, `status`, `saleStatus`, `ticketingProvider`, `isPremiere`, `from`, `to`, sorting, page, and limit; CRUD plus `/:id/ticketing-summary`.
- `/venues`, `/seat-maps`, `/seats`, `/price-plans`, `/price-categories`: operational resource APIs. Seats include a bulk endpoint.
- `/orders`: list/detail/status administration.
- `/customers`: legacy admin customer management.
- `/form-options/{event|production|artist|seat-map|price-plan|news|homepage|promo-slide}`: typed form option data.
- `/system/status`: counts and configuration warnings.

Modern CMS list responses are generally `{ success, items, page, limit, total, totalPages, pagination }`. Some older operational endpoints return `{ success, items }` or a smaller pagination shape; frontend services map these explicitly.

### Public content API

Prefix: `/api/public`. Authentication: none.

- `GET /home`: returns `{ success, config, slides, upcomingEvents, repertoireProductions, featuredProductions, featuredNews, data }`, resolving manual/automatic HomepageConfig modes, publication windows, and active Promo Slides.
- `GET /repertoire`: query `view=current|announced|archive`, optionally month/year; returns `{ success, view, events, announcements, availableMonths, data }`.
- `GET /productions`: supports `type`, `isOnRepertoire`, and `q`; returns published summaries.
- `GET /productions/:slug`: published detail with `{ success, item, production, events, upcomingEvents }`.
- `GET /artists` and `/artists/:slug`: published summaries/detail; detail includes related Productions where available.
- `GET /news` and `/news/:slug`: published, currently active News content. The Angular routes are not implemented yet.
- `GET /pages/:slug`: published structured page DTO. Contact augments content from SiteSettings where configured.
- `GET /site-settings`: public enabled/filtered logos, navigation/footer/contact/social/legal/partner/default-SEO data.
- `POST /contact` and newsletter subscription endpoints: store public submissions.

Public DTOs enforce `published` state and publication time, populate safe relations, and omit internal audit/storage/Mongoose fields.

### Guest ticketing API

Prefix: `/api/public`. Authentication: no account; session ownership is required.

- `GET /events/:eventId/seats`: returns `{ success, event, seats }`; each seat includes identifying/layout/category/price information and `available`, `locked`, `reserved`, `sold`, or `unavailable` status. The handler expires stale lock/order state before responding, so it is not a strictly read-only diagnostic call.
- `POST /events/:eventId/seats/lock`: accepts selected seats and session ownership data; validates sellability, conflicts, limits, and current PricePlan; returns lock expiry and locked seats.
- `POST /events/:eventId/seats/release`: releases locks owned by that session.
- `POST /orders`: requires valid owned locks and a guest snapshot including full name and email; creates an unpaid reserved order, snapshots OrderItems, and converts locks.
- `GET /orders/:identifier?sessionId=...`: returns a guest order only when its session matches.

Sale availability is normalized into public states such as upcoming, on sale, sold out, closed, free, cancelled/postponed/finished, or unavailable. Internal ticket purchase requires ticketing enabled, provider `internal`, and valid SeatMap and PricePlan relations.

### Legacy customer API

Prefix: `/api/customer`. It still exposes register/login and protected profile/orders routes. This is legacy code and is not used by the public Angular application. Do not use it as a basis for new public UX.

## 7. Database, Seeds, and Migrations

### Environment

Database: `madlenianum`.

Required/configurable environment variable names, without values:

```text
PORT
MONGO_URI
CLIENT_URL
JWT_SECRET
JWT_EXPIRES_IN
UPLOAD_DIR
MEDIA_UPLOAD_SUBDIR
MEDIA_MAX_FILE_SIZE_MB
ADMIN_USERNAME
ADMIN_EMAIL
ADMIN_PASSWORD
```

The current `.env` defines `PORT`, `MONGO_URI`, `CLIENT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Never copy secret values into documentation or client code.

### Scripts and safe local order

Defined in `server/package.json`:

```powershell
cd C:\Zepter\Madlenianum\server
npm install
npm run seed:admin
npm run seed:phase2a
npm run seed:content
npm run dev
```

- `seed:admin` runs `src/seed/admin.seed.js`. It upserts by email and deliberately resets the configured password hash, role, and active status. Idempotent for a local admin identity, but it changes credentials.
- `seed:phase2a` runs `src/seed/phase2a.seed.js`. It seeds venue, categories, plans, map, seats, Production, and Event. It deletes and recreates the 504 seats for its SeatMap, so it is not safe for a populated database with seat/order references. Run on a fresh/demo DB and before content.
- `seed:content` runs `src/seed/phase3content.seed.js`; `seed:phase3a` is an alias. It uses relative future demo dates and upserts Media, Artists, Productions, Events, Promo Slides, Static Pages, News, HomepageConfig, SiteSettings, and legacy demo Customers. It also replaces specifically identified demo orders/items/locks and removes some legacy demo slides. It is repeatable for the demo dataset, not production-safe.
- `seed:remove-weight` unsets obsolete `weight` fields across affected collections. It is an optional one-time cleanup, not part of every startup. It changes all matching records.
- `migrate:structured-content` runs `src/migration/migrateStructuredContent.js`, filling structured gallery/video/credit data when absent. It is designed to be repeatable but writes records; back up and inspect production data first.
- `test:cms` runs `server/src/tests/cms-phase2.smoke.js`. It creates temporary records, touches singleton configs with test updates, and cleans up. It is not a read-only test.
- `src/seed/resetAdminPassword.seed.js` is a legacy maintenance script without a package command and changes credentials. Do not run casually.

Commands that seed, clean, migrate, or run the CMS smoke test must never be run blindly against production data.

### Read-only database snapshot at handoff

- AdminUser 1; Media 34; Production 10; Artist 4; News 4; PromoSlide 8.
- StaticPage 2; HomepageConfig 1; SiteSettings 1.
- Venue 2; Event 16; SeatMap 1; Seat 504; PricePlan 9; PriceCategory 4.
- SeatLock 26; Order 13; OrderItem 26; Customer 3.
- Eight future Events were ticketable at inspection time.
- `o-nama` and `kontakt` existed with published status.

The SeatLock count includes historical/expired rows and is not an active-lock count. Counts are a diagnostic snapshot, not contractual seed expectations.

## 8. Tests and Verified Commands

Actually run for this handoff:

- Frontend production build passed:
  `npm.cmd run build -- --output-path C:/tmp/madlenianum-handoff-build-20260722-1417` from `client`.
- Every JavaScript file under `server/src` passed `node --check` syntax validation.
- Read-only database count/status queries passed.
- Existing backend smoke requests passed for health, public home, current repertoire, About, Contact, one Production detail, Artists list, and one Artist detail.
- Browser desktop verification passed for homepage, repertoire, and Production detail; principal content rendered, ticket links were present, no horizontal overflow was found, and no new browser console errors appeared.
- Browser mobile verification at 390x844 passed for homepage, repertoire, Production detail, and the opening/closing state of the mobile navigation; no horizontal overflow or console errors appeared.

Observed API snapshot during verification:

- Home: 5 slides, 8 upcoming Events, 4 repertoire Productions, 4 featured Productions, and 4 featured News items.
- Current repertoire: 10 Events and 8 ticket purchase links in rendered browser content.
- Inspected Production detail: 3 upcoming Events.
- Artists list: 4 Artists; inspected Artist detail had 2 related Productions.

Build warnings still present:

- Initial bundle was approximately 983.75 kB and exceeded the configured 500 kB warning budget by approximately 483.75 kB.
- `public-repertoire.component.scss` exceeded its 4 kB component style budget by about 726 bytes.
- `public-ticketing.component.scss` exceeded it by about 1.42 kB.
- `public-production-detail.component.scss` exceeded it by about 3.72 kB.

Not run during this handoff because they change data:

- `npm run seed:admin`, `seed:phase2a`, `seed:content`, or `seed:remove-weight`.
- `npm run migrate:structured-content`.
- `npm run test:cms`.
- A real admin login, because login updates `lastLoginAt`.
- Seat loading/lock/order creation, because seat loading performs expiry cleanup and the rest writes ticketing state.

The repository and commit history contain these commands and prior implementations, but this handoff does not claim a fresh passing result for any command not listed as actually run above.

## 9. Important Business Rules

- Only administrators have accounts. Public users must never be forced to register or log in.
- Guest seat selection, reservation, order creation, and lookup use session ownership and contact snapshots.
- Future confirmation delivery is by email; do not invent account inboxes or fake payment behavior.
- A Production is editorial content. An Event is one concrete performance of a Production.
- A SeatMap is the permanent physical map. Event-specific blocked, VIP, protocol, or unavailable seats must not mutate the base SeatMap; they require a future Event-level override model.
- OrderItem seat/category/price values are historical snapshots and must remain stable even when current prices or seats change.
- Draft, archived, and future-scheduled content must not leak through public APIs.
- Used Media, Artists, Productions, and Events require conflict-aware deletion or archive behavior.
- Price Plans and Price Categories must gain equivalent ticket-history/reference protection in Phase 4A; current controllers do not yet fully enforce it.
- Public APIs must return DTOs, not raw Mongoose documents or internal audit/storage fields.
- Never select an arbitrary unsorted Event for a ticket action. Use a valid, ordered, ticketable Event.

## 10. Coding Conventions

- Angular components use separate `.ts`, `.html`, and `.scss` files; no inline templates/styles.
- Admin forms use readable Reactive Forms with explicit loading, mapping, payload building, save, and validation paths.
- Use typed interfaces in `client/src/app/core/models`; reduce remaining `any` usage when touching those screens.
- Services, controllers, routes, and mappings are explicit. Do not add generic CRUD factories or hidden dynamic form engines.
- Administrators should receive structured fields and controls, not raw JSON editors.
- The obsolete generic `weight` field must not return. CSS `font-weight` and the cleanup script name are unrelated.
- Use `displayOrder` only where explicit editorial order has business meaning.
- Resolve Media URLs through `MediaUrlService`; do not concatenate server hosts in templates.
- Use centralized Serbian labels, enum presentation, category grouping, and Europe/Belgrade formatting.
- Backend validation is authoritative; frontend validation improves UX but cannot replace it.
- Preserve backward compatibility with legacy gallery/video/credit data until a deliberate migration/removal phase.
- Reuse existing models and endpoints. Do not create duplicate CMS or public APIs.
- Maintain publication filtering and DTO sanitization whenever extending public responses.

## 11. Known Limitations and Deferred Work

- Repertoire has already been redesigned for the current Figma phase; remaining work is final pixel/content QA rather than rebuilding it.
- Production detail has the current Figma implementation; remaining Production-list polish is separate.
- Public Productions list, Artists list/detail, About, Contact, ticketing, and order lookup are functional but not all final-design screens.
- Dedicated public News list/detail Angular routes and screens are absent.
- The generic Static Page component has fallback content on API errors; About/Contact need final design/content behavior review.
- SeatMap designer is functional but needs a future visual/ergonomic redesign.
- `EventSeatOverride` does not exist.
- Seats are locked after an explicit hold action, not instantly on every selection click.
- Guest checkout/ticketing and order confirmation need final UX redesign.
- Confirmation emails are not implemented.
- Payment provider integration is not implemented.
- Admin Orders remains a practical list/detail/status workflow, not a final redesign.
- Fundus and Fundus reservations do not exist.
- Venue rental and rental enquiries do not exist.
- Multilingual public switching does not exist.
- Event-specific cast overrides do not exist.
- Event duplication is not implemented.
- PricePlan validation/versioning and ticket-history protection are incomplete.
- PriceCategory reference/history protection is incomplete.
- Legacy `/api/customer` authentication and demo Customer records remain and should not be extended.

## 12. Next Phase

### Phase 4A - Events, pricing, and ticketing configuration rules

Start from the existing Event form/detail/controllers and strengthen them; do not recreate the subsystem.

Intended scope:

- Normalize and consistently present Event and sale statuses.
- Complete practical Event list/form/detail operational behavior.
- Add explicit Event duplication with safe copied/reset fields.
- Strengthen internal/external/free ticket provider validation.
- Enforce Event-Venue-SeatMap-PricePlan compatibility.
- Protect Events that have locks, orders, OrderItems, or ticketing history.
- Add useful Event operational statistics.
- Add PricePlan rule validation, safe versioning/duplication, and historical protection.
- Protect PriceCategories referenced by Seats, PricePlans, and historical OrderItems.
- Expand system configuration warnings for invalid or incomplete ticketing setup.

Phase 4A must not implement:

- SeatMap visual editor redesign.
- EventSeatOverride.
- Public instant seat locking.
- Guest checkout redesign.
- Payment processing.
- Confirmation emails.
- Public accounts or customer authentication.

## 13. Risks for the Next Session

- Do not create duplicate Production/Event/Media/Homepage/SiteSettings models or parallel endpoints; the current implementations are substantial.
- Do not replace the Phase 1 Media Library or bypass usage-aware deletion.
- Do not return raw populated Mongoose documents from public endpoints.
- Do not weaken published/status/time-window filters or expose drafts/archives.
- Do not edit a historical PricePlan in place once orders depend on it; implement versioning/copy behavior.
- Do not mutate the permanent SeatMap for one Event's VIP/protocol/blocking needs.
- Do not reintroduce public registration/login/profile from the legacy Customer routes.
- Do not remove legacy compatibility fields until records are migrated and readers no longer require them.
- Do not run `phase2a`, content seeds, cleanup scripts, migrations, or CMS smoke tests against production without backup and explicit approval.
- Do not delete PricePlans or PriceCategories before adding the missing reference/history checks.
- Do not treat all SeatLock rows as active; status and expiry must be evaluated.
- Do not discard `PROJECT_HANDOFF.md` or assume a clean status means there was no handoff-only untracked file.

## 14. Safe Start Instructions

1. Read `C:\Zepter\Madlenianum\PROJECT_HANDOFF.md` completely.
2. Run `git status --short --branch`, `git rev-parse HEAD`, and `git diff --stat` before editing.
3. Inspect the actual files relevant to the requested phase. Treat this handoff as a map, not a substitute for code inspection.
4. Do not reset, restore, stash, clean, discard, commit, or push existing work unless explicitly asked.
5. Run a non-destructive frontend build and backend syntax checks as a baseline. Ask before running any seed, migration, CMS smoke test, login, or ticketing flow that writes data.
6. Compare actual routes/models/controllers/components with this document and report meaningful inconsistencies before changing code.
7. Preserve existing Media, CMS, homepage, Repertoire, Production detail, admin auth, and guest ticketing behavior.
8. Implement only the explicitly requested next phase. For Phase 4A, begin with the existing Event/PricePlan/PriceCategory code and the boundaries in section 12.

## 15. Copy-Ready Onboarding Message

```text
You are continuing the Madlenianum project at C:\Zepter\Madlenianum from another Codex session. First read C:\Zepter\Madlenianum\PROJECT_HANDOFF.md completely, then inspect the current repository and exact Git state. Make no changes initially. Summarize your understanding of the implemented frontend/backend, current limitations, business rules, and planned Phase 4A. Report any conflict between the handoff and the actual code or Git state. Do not reset, discard, seed, migrate, commit, or push anything. After the summary, wait for my next implementation prompt.
```
