Madlenianum
===========

MEAN-style application with an Express/MongoDB backend in `server` and an Angular frontend in `client`.

Backend setup
-------------

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

Frontend setup
--------------

```powershell
cd C:\Zepter\Madlenianum\client
npm install
npm start
```
