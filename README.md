# Madlenianum

MEAN-style application with an Express/MongoDB backend in `server` and an Angular frontend in `client`.

## Prerequisites

Before running the project, make sure you have:

* Node.js installed
* MongoDB running locally on `127.0.0.1:27017`
* npm installed
* project cloned locally

Recommended project location:

```powershell
C:\Zepter\Madlenianum
```

## Backend environment

Create `.env` file inside the `server` folder:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/madlenianum

CLIENT_URL=http://localhost:4200

JWT_SECRET=madlenianum_dev_secret_change_later
JWT_EXPIRES_IN=7d

UPLOAD_DIR=uploads

ADMIN_USERNAME=mdleditor
ADMIN_EMAIL=marketing@madlenianum.rs
ADMIN_PASSWORD=Admin123!
```

## Copy demo images to backend uploads

Before running `seed:content`, copy demo images from frontend public folder to backend uploads folder:

```powershell
cd C:\Zepter\Madlenianum

New-Item -ItemType Directory -Force -Path .\server\uploads\madlenianum

Copy-Item -Recurse -Force .\client\public\madlenianum\* .\server\uploads\madlenianum\
```

## Backend setup

Run backend setup and seed scripts in this order:

```powershell
cd C:\Zepter\Madlenianum\server

npm install

npm run seed:admin
npm run seed:phase2a
npm run seed:content
npm run seed:remove-weight

npm run dev
```

`seed:phase3a` is available as a clearer alias for `seed:content`.

So this can also be used:

```powershell
npm run seed:phase3a
```

Backend runs on:

```text
http://localhost:5000
```

## Frontend setup

Open another terminal and run:

```powershell
cd C:\Zepter\Madlenianum\client

npm install
npm start
```

Frontend runs on:

```text
http://localhost:4200
```

## Admin panel

Admin URL:

```text
http://localhost:4200/admin/login
```

Admin credentials:

```text
marketing@madlenianum.rs
Admin123!
```

## Basic testing flow

After starting backend and frontend:

1. Open public site:

```text
http://localhost:4200
```

2. Open repertoire page and choose an event.

3. Open ticketing page.

4. Select seats.

5. Click `Kupi`.

6. Check that order confirmation opens.

7. Open admin panel.

8. Check created order in admin orders section.

## Useful backend scripts

```powershell
npm run seed:admin
```

Creates or resets the admin user.

```powershell
npm run seed:phase2a
```

Creates base ticketing data: venues, seat maps, seats, price categories, price plans and base event.

```powershell
npm run seed:content
```

Creates demo public content: productions, artists, media, promo slides, events and demo orders.

```powershell
npm run seed:phase3a
```

Alias for `seed:content`.

```powershell
npm run seed:remove-weight
```

Removes obsolete `weight` fields from existing MongoDB documents.

## Common issues

### MongoDB connection error

Make sure MongoDB is running locally:

```text
mongodb://127.0.0.1:27017/madlenianum
```

### Images are not loading

Run the image copy command again:

```powershell
cd C:\Zepter\Madlenianum

New-Item -ItemType Directory -Force -Path .\server\uploads\madlenianum

Copy-Item -Recurse -Force .\client\public\madlenianum\* .\server\uploads\madlenianum\
```

Then restart backend.

### PowerShell npm issue

If PowerShell has problems with `npm`, use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run seed:admin
npm.cmd run seed:phase2a
npm.cmd run seed:content
npm.cmd run dev
```
