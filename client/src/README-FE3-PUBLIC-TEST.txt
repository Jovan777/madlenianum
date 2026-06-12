Madlenianum FE-3 Public Testing Frontend

This src folder contains:
- existing admin testing panel
- public user-facing testing frontend
- public home, repertoire, production pages, artists, ticketing seat map, order lookup

Important:
- Components use separate .ts / .html / .scss files.
- This is still a testing frontend, not a final designer-approved implementation.
- Backend must run on http://localhost:5000.
- Environment API base is src/environments/environment.ts.

Recommended seed order:
1. server: npm run seed:phase2a
2. server: npm run seed:content
3. server: npm run dev
4. client: npm start

Public routes:
/
/repertoar
/predstave
/predstave/:slug
/kupovina/:eventId
/porudzbina
/porudzbina/:identifier
/umetnici
/umetnici/:slug
/strana/:slug

Admin routes are preserved under /admin.
