# Mnyazi-Dream-Decors

Booking system for Mnyazi Dream Decor (event tents, décor, stages and sound, Kilifi).
Plans and decisions: [PROJECT-NOTES.md](PROJECT-NOTES.md), [CLAUDE.md](CLAUDE.md), [DESIGN-PROMPT.md](DESIGN-PROMPT.md).

## What you need
- Node.js 22.13 or newer (it has SQLite built in)
- Run `npm install` once, to download Express (the web server library)

## Run it
| Command | What it does |
|---|---|
| `npm start` | Starts the website at http://localhost:3000 (stop with Ctrl + C) |
| `npm run db:setup` | Builds the database `data/mnyazi.db` from `db/schema.sql` and `db/seed.sql` |
| `npm run db:check` | Prints the price list back out of the database |
| `npm run db:reset` | Deletes the database and builds a fresh one (careful: removes all bookings) |

Pages: http://localhost:3000 (homepage) and http://localhost:3000/prices.html (prices from the database).
Data for the browser: `/api/items`, `/api/packages`, `/api/options`.

## Folders
- `public/`: the website people see (HTML, CSS, JavaScript, photos)
- `server.js`: starts the web server
- `routes/`: the web addresses the server answers (`routes/items.js` = price list and packages)
- `lib/`: shared functions (`lib/catalogue.js` reads prices and packages from the database)
- `db/`: the database: tables (`schema.sql`), starting data (`seed.sql`) and the scripts that use them
- `data/`: the database file itself (not saved to GitHub because it holds customer details)

## Progress
1. Database and price list: done
2. Price list on the page from the database: done (packages from the 2024 rate card)
3. Quote and total: next
