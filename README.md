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

## Demo media files

`server/uploads` contains runtime/user files and is intentionally ignored by Git. The content seed expects the demo files supplied in `client/public/madlenianum` to also exist under `server/uploads/madlenianum`.

On a new machine, copy them once before `seed:content`:

```powershell
cd C:\Zepter\Madlenianum
New-Item -ItemType Directory -Force -Path .\server\uploads\madlenianum
Copy-Item -Recurse -Force .\client\public\madlenianum\* .\server\uploads\madlenianum\
```

The seed creates or updates Media database records but does not duplicate the physical files.

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

Deletion is blocked when a Media record is referenced by a production, artist, news article, promo slide, static page, or venue. Unused managed files are deleted from both MongoDB and local storage.

## Build and verification

```powershell
cd C:\Zepter\Madlenianum\client
npm run build
```

If PowerShell blocks the `npm.ps1` shim, use `npm.cmd` for the same commands.
