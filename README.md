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
| `npm run admin:password` | Sets the office admin password (saved scrambled in `.env`, never on GitHub). Restart the server after. |

Pages: http://localhost:3000 (homepage), /build.html (build your event: quote and total) and /prices.html (prices from the database).
Data for the browser: `/api/items`, `/api/packages`, `/api/options`, `POST /api/quote` (prices a quote on the server), `POST /api/bookings` (saves a booking request) and `/api/status/<code>`.
Each booking gets a private page at `/status/<code>` (kept out of Google).
Office admin page: http://localhost:3000/admin/ (password needed; see `npm run admin:password`).

Testing without touching your real database: set `MNYAZI_DB` to another file first, e.g. in PowerShell `$env:MNYAZI_DB = "C:	emp	est.db"; npm start`.

## Folders
- `public/`: the website people see (HTML, CSS, JavaScript, photos)
- `server.js`: starts the web server
- `routes/`: the web addresses the server answers (`items.js` price list, `quote.js`, `bookings.js`, `admin.js`)
- `scripts/`: small helper commands (`set-admin-password.js`)
- `lib/`: shared functions; ALL the SQL lives here (`catalogue.js` prices and packages, `settings.js` office settings, `quote.js` prices a quote, `bookings.js` saves and reads bookings, `office.js` what the office does with them, `auth.js` the admin password and login)
- `public/js/quote-math.js`: the one function that works out totals, used by BOTH the browser and the server
- `public/js/budget-fit.js`: picks the packages that fit a budget, guest count and event type
- `public/js/kenya-phone.js`: checks Kenyan phone numbers (browser and server)
- `db/`: the database: tables (`schema.sql`), starting data (`seed.sql`) and the scripts that use them
- `data/`: the database file itself (not saved to GitHub because it holds customer details)

## Progress
1. Database and price list: done
2. Price list on the page from the database: done (packages from the 2024 rate card)
3. Quote and total: done (build.html)
3b. Budget finder: done (top of build.html; logic in public/js/budget-fit.js)
4. Save the booking: done (details form, booking number MDD-YYYY-NNNN, private status page)
5. Admin page for the office: booking requests and one booking done (login, prices for custom items, stock on the date, transport, discount, confirm and send on WhatsApp, decline, cancel)
5b. Admin: edit items, prices and packages: next
