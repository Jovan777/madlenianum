# Atlas, Render and Vercel readiness

This document prepares deployment configuration; it does not deploy the application.

## Topology

- MongoDB Atlas stores application data.
- Render runs `server` as a Node web service.
- Vercel serves the Angular build from `client/dist/madlenianum-client/browser`.
- The Vercel build generates a browser runtime configuration from
  `MADLENIANUM_API_ORIGIN`. Angular uses that Render origin for both `/api` and
  `/uploads`; the backend hostname is not hardcoded in source.

## Render backend

- Root directory: `server`
- Build command: `npm ci`
- Start command: `npm start`
- Health check: `/api/health`
- Readiness check: `/api/ready`
- Runtime: a supported Node 22 or 24 release

Required production environment:

- `NODE_ENV=production`
- `PORT` (Render supplies this)
- `MONGO_URI`
- `JWT_SECRET` (unique random value of at least 32 characters)
- `JWT_EXPIRES_IN`
- `CLIENT_URLS` (comma-separated exact Vercel production/preview origins that are intentionally allowed)
- `TRUST_PROXY_HOPS=1` for the normal single Render proxy path; verify if topology changes
- `PUBLIC_SITE_URL`
- `EMAIL_TRANSPORT=smtp`
- `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`
- inquiry recipient variables or private SiteSettings recipients

Configurable limits/lifecycle:

- `JSON_BODY_LIMIT`, `URLENCODED_BODY_LIMIT`
- `UPLOAD_DIR`, `MEDIA_UPLOAD_SUBDIR`, `MEDIA_MAX_FILE_SIZE_MB`, `MEDIA_MAX_FILES_PER_UPLOAD`
- `RESERVATION_DURATION_MINUTES`, `PAYMENT_HOLD_MINUTES`, `ORDER_EXPIRY_INTERVAL_MS`
- `ORDER_RESEND_COOLDOWN_SECONDS`, `INQUIRY_RESEND_COOLDOWN_SECONDS`
- all `RATE_LIMIT_*` variables from `server/.env.example`

Do not run seeds or migrations as a Render startup command.

## Repository-managed media on free Render

The approved production media catalog is committed below
`server/uploads/madlenianum` and is included in every Render deploy. The backend
serves it through `/uploads/*`, and Angular resolves those URLs against
`MADLENIANUM_API_ORIGIN`.

The free Render filesystem remains ephemeral. Therefore:

- prepare uploads locally;
- commit each approved image/PDF and its Media/seed references;
- redeploy Render after media changes;
- do not treat an upload made directly on the deployed admin as persistent.

MongoDB does not contain these physical files. Git history is the production media
backup, so verify that every referenced file is committed before release.

## MongoDB Atlas

1. Create a dedicated database user with only the required application database permissions.
2. Configure Atlas network access for Render's supported outbound path; avoid broad access where a tighter rule is available.
3. Use TLS Atlas connection strings and never commit them.
4. Run `npm run validate:indexes` against a restored staging copy before launch.
5. Review optional migrations individually; never run them blindly against production.
6. Enable Atlas backups. Test restore into a separate cluster/database before launch.

Backup scope includes MongoDB plus the Git revision containing the matching media
catalog. A database restore against the wrong revision can leave Media records
without files.

## Vercel frontend

- Root directory: `client`
- Install command: `npm ci`
- Build command: `npm run build:vercel`
- Output directory: `dist/madlenianum-client/browser`

`client/vercel.json` configures the Angular build, output directory and SPA fallback.
Set this Vercel environment variable for Production and Preview as appropriate:

- `MADLENIANUM_API_ORIGIN=https://<render-service>.onrender.com`

The build validates that this value is HTTPS and generates
`public/runtime-config.js`. API and media requests then go directly to Render;
separate `/api` and `/uploads` proxy rewrites are not required.

Add every intentionally used Vercel origin to `CLIENT_URLS`. Do not use `*` with credentialed CORS.

## Scheduled lifecycle processing

The backend runs defensive Order/lock expiry processing in-process and also checks expiry during relevant reads/actions. Keep only one authoritative scheduled runner if the Render service is horizontally scaled; otherwise each instance may perform the same idempotent work. The current jobs are designed to be repeatable, but a dedicated worker/cron is preferable for predictable production operations.

## Email and payment

`EMAIL_TRANSPORT=json` is local/test mode only. Production requires verified SMTP configuration. Email failure is recorded and does not roll back a successful Order or inquiry.

No completed online payment provider was found in the active runtime. `Kupi` creates `pending_payment`; only an authorized transition can mark an Order paid. The legacy payment reference directory, if retained outside this checkout, must remain excluded from runtime/build/deployment.

## Production checks

Run against staging:

```powershell
cd server
npm ci
npm run validate:indexes
npm run test:production-startup

cd ..\client
npm ci
npm run test:i18n
$env:MADLENIANUM_API_ORIGIN="https://<render-service>.onrender.com"
npm run build:vercel
```

Then execute `docs/MANUAL_TEST_MATRIX.md` with disposable records.
