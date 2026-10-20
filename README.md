# Mnyazi-Dream-Decors

Booking system for Mnyazi Dream Decor (event tents, décor, stages and sound, Kilifi).
Plans and decisions: [PROJECT-NOTES.md](PROJECT-NOTES.md), [CLAUDE.md](CLAUDE.md), [DESIGN-PROMPT.md](DESIGN-PROMPT.md).

## What you need
- Node.js 22.13 or newer (it has SQLite built in, so there is nothing to install)

## Run it
| Command | What it does |
|---|---|
| `npm run db:setup` | Builds the database `data/mnyazi.db` from `db/schema.sql` and `db/seed.sql` |
| `npm run db:check` | Prints the price list back out of the database |
| `npm run db:reset` | Deletes the database and builds a fresh one (careful: removes all bookings) |

Homepage: open `public/index.html` in a browser.

## Folders
- `public/`: the website people see (HTML, CSS, JavaScript, photos)
- `db/`: the database: tables (`schema.sql`), starting data (`seed.sql`) and the scripts that use them
- `data/`: the database file itself (not saved to GitHub because it holds customer details)

## Progress
1. Database and price list: done
2. Price list on the page from the database: next
