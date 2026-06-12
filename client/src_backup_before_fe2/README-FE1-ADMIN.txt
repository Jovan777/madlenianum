Madlenianum FE-1 Admin Testing Panel

Ovaj ZIP sadrži kompletan src folder za prvi test frontend.
Nije finalni dizajn javnog sajta, nego funkcionalni admin/testing UI za backend.

Pre kopiranja:
1. Sačuvaj postojeći client/src ako želiš backup.
2. Proveri da postoji logo:
   client/public/madlenianum/logo.png

Kopiranje:
- sadržaj ovog zip-a prekopiraj u:
  C:\Zepter\Madlenianum\client\src

Backend mora da radi:
  cd C:\Zepter\Madlenianum\server
  npm run dev

Frontend:
  cd C:\Zepter\Madlenianum\client
  npm start

Login URL:
  http://localhost:4200/admin/login

Login:
  marketing@madlenianum.rs
  Admin123!

Bitno:
- Komponente su odvojene na .ts / .html / .scss.
- Nema inline template/style blokova u @Component.
- Ovo testira admin login, dashboard, system status, liste, event detail i order status update.
