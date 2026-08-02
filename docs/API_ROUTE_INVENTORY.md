# API route inventory

All responses are JSON unless a Media file is requested. Public list/detail routes return explicit DTOs and filter unpublished or archived editorial content. Admin routes below `/api/admin` require `Authorization: Bearer <admin-token>` except login.

## Platform routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | Public | Minimal API identity response. |
| GET | `/api/health` | Public | Liveness check; does not depend on MongoDB readiness. |
| GET | `/api/ready` | Public | Readiness check; returns `503` until MongoDB is connected. |
| GET | `/uploads/*` | Public | Managed uploaded files from configured storage. |

## Public read routes

| Prefix/routes | Purpose and behavior |
| --- | --- |
| `GET /api/public/home` | Published homepage DTO assembled from HomepageConfig, active PromoSlides, Events, Productions, News, About content and SiteSettings. |
| `GET /api/public/repertoire` | Public Event programme. Supports the existing repertoire filters and returns only public Events. |
| `GET /api/public/productions`, `GET /api/public/productions/:slug` | Published Production list/detail with related public Events and editorial relationships. |
| `GET /api/public/artists`, `GET /api/public/artists/:slug` | Published Artist list/detail and related Productions. |
| `GET /api/public/news`, `GET /api/public/news/:slug` | Published News list/detail; scheduled future publications are hidden. |
| `GET /api/public/pages/:slug` | Published structured static page DTO. |
| `GET /api/public/site-settings` | Public-only SiteSettings DTO. Private inquiry recipients and internal configuration are excluded. |
| `GET /api/public/fundus/costumes[/:slug]` | Published costume catalogue list/detail with server filtering and pagination. |
| `GET /api/public/fundus/props-scenography[/:slug]` | Published prop/scenography list/detail with server filtering and pagination. |
| `GET /api/public/rental-spaces[/:slug]` | Published RentalSpace list/detail. |
| `GET /api/public/events/:eventId/seats` | Effective Event seat states and authoritative category prices. Internal override notes are excluded. |
| `GET /api/public/events/:eventId/seats/locks/current` | Restores the caller's active checkout locks using the guest session contract. |
| `GET /api/public/orders/:identifier` | Secure guest Order view; requires the secure token/session contract and never exposes internal or email-provider fields. |

The public locale middleware accepts the existing locale contract (`sr`/`en`). Missing, draft, archived or not-yet-published editorial resources return `404` rather than an admin document.

## Public mutation routes

| Method and route | Protection | Purpose |
| --- | --- | --- |
| `POST /api/public/events/:eventId/seats/lock` | Seat-lock rate limit, validation and atomic unique active-lock index | Atomically locks all selected seats for a guest checkout session. |
| `POST /api/public/events/:eventId/seats/release` | Seat-lock rate limit and guest session validation | Releases eligible locks owned by that session. |
| `POST /api/public/orders` | Public-mutation rate limit, lock ownership, idempotency key and backend pricing | Creates a reservation or pending-payment Order. |
| `POST /api/public/orders/lookup` | Strict lookup rate limit | Finds a guest Order using reference and email, then returns a secure view contract. |
| `POST /api/public/rental-inquiries` | Public-mutation rate limit and idempotency key | Creates a non-binding inquiry for one RentalSpace. |
| `POST /api/public/event-planning-inquiries` | Public-mutation rate limit and idempotency key | Creates a general Event Planning inquiry. |
| `POST /api/public/newsletter/subscribe` | Public-mutation rate limit | Newsletter subscription. |
| `POST /api/public/contact` | Public-mutation rate limit | Contact message submission. |

There are no public registration, login, profile, Fundus reservation or customer-account routes.

## Admin authentication and operations

| Method and route | Access | Purpose |
| --- | --- | --- |
| `POST /api/admin/auth/login` | Public, strict login rate limit | Email/password administrator login. |
| `GET /api/admin/auth/me` | Admin | Authenticated administrator DTO. |
| `GET /api/admin/system/status` | Admin | Counts plus actionable configuration/lifecycle warnings. |
| `GET /api/admin/audit-logs` | Admin | Paginated safe admin activity audit. Filters: `action`, `entityType`, `admin`, `page`, `limit`. |

Authenticated CRUD and operational prefixes:

- `/api/admin/media`
- `/api/admin/artists`
- `/api/admin/venues`
- `/api/admin/productions`
- `/api/admin/events`
- `/api/admin/news`
- `/api/admin/promo-slides`
- `/api/admin/pages`
- `/api/admin/newsletter-subscribers`
- `/api/admin/contact-messages`
- `/api/admin/price-categories`
- `/api/admin/price-plans`
- `/api/admin/seat-maps`
- `/api/admin/seats`
- `/api/admin/form-options`
- `/api/admin/homepage-config`
- `/api/admin/site-settings`
- `/api/admin/customers` (internal contact records, not public accounts)
- `/api/admin/orders`
- `/api/admin/fundus/costumes`
- `/api/admin/fundus/props-scenography`
- `/api/admin/rental-spaces`
- `/api/admin/rental-inquiries`
- `/api/admin/event-planning-inquiries`

Important Event subroutes include validation, duplication, ticketing summary, close-sale/cancel/archive actions, Event overrides and effective map preview. Important Order subroutes include overview, detail, validated status transitions, cancellation, mark-paid, secure public link and rate-limited confirmation resend. SeatMap routes include preview, stable-seat bulk changes, duplication and conflict-aware archive/delete behavior.

## Error contract

- `400`: malformed IDs, invalid payloads or field validation; field errors are returned where the controller has structured validation.
- `401`: missing/invalid admin bearer token.
- `403`: forbidden CORS origin or forbidden transition where applicable.
- `404`: missing resource, unavailable public content or unknown route.
- `409`: lifecycle conflict, incompatible ticketing configuration, stale/expired lock or unsafe deletion/change.
- `429`: rate limit or resend cooldown.
- `500`: safe generic production response. Stack traces and provider internals are not exposed in production.

