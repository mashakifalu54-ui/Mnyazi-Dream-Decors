# Instructions for Claude (Mnyazi Dream Decor booking system)

Read PROJECT-NOTES.md first. Developer: Timothy, a beginner learning JavaScript and Node. Explain every file and every SQL statement in plain words, build in small layers, and let him run each layer before the next. Never paste code he cannot explain. Commit after each working step.

## Stack
HTML + CSS + plain JavaScript (no Tailwind, no framework). Node.js + Express. SQLite. PDFKit for PDFs. Runs on localhost on Windows. Keep data in the database, one job per file, reuse functions.

## Document flow (decided)
There are three documents, each from a booking, never typed by hand:
1. QUOTE: created when the customer sends the request. Custom items show "price pending". Office reviews, prices custom items, adds transport/discount, checks stock for the event date, then clicks "Confirm & send quote".
2. INVOICE: created when the office confirms the booking. Shows total, deposit due (50%, configurable), balance, M-Pesa payment details, number MDD-YYYY-NNNN.
3. RECEIPT: created each time the office records a payment (amount + M-Pesa code). Shows paid so far and balance left.
Booking status: new -> needs_price (custom items) -> quoted -> deposit_paid (date held) -> fully_paid -> completed -> declined/cancelled.
One bookings table, one booking_lines table (item_id or custom_name, qty, unit_price, line_total, status), one payments table. Totals are always calculated from lines in one function, never stored by hand.

## Sending to the client
Prototype: the office page has a "Send on WhatsApp" button that opens a wa.me chat to the client's number with a ready message and a private status-page link (long random token) where the client views and downloads the PDF. Also a "Download PDF" button. No WhatsApp Business API yet (it needs approval and costs money). Later options: M-Pesa Daraja STK Push to confirm payments automatically; WhatsApp Business API.

## Reviews (decided)
No open comment box. After the office marks a booking "completed", the system makes a private review link to send on WhatsApp. Only that link can submit: 1-5 stars, a comment, optional photo. Reviews start as "pending"; the office approves before it shows on the site (first name + event type + "Verified booking"). Table reviews(id, booking_id UNIQUE, rating 1-5, comment, photo, status pending/approved/hidden, created_at). Also show a "Review us on Google" link.

## Design
Read DESIGN-PROMPT.md for the full look, feel, motion and UX rules; it wins over everything else about visuals.
Brand navy #15224A, gold #C9A227, fonts Marcellus + Manrope. Design files in design-canvas/, interactive front-end in booking-prototype/src.html, Canva link in PROJECT-NOTES.md. Use the original full-size photos and video in the repo.

## Build order
1 database + seed from for_website_demo.xlsx; 2 price list from DB; 3 quote and total; 4 save booking; 5 admin page (bookings, one booking, items/prices, packages); 6 PDFs (quote, invoice, receipt); 7 reviews; 8 PDF learning book (every file and SQL statement, with a "try this" change per chapter).

## Payments (design for scaling, decided 20 Oct 2026)
Build payments as a swappable layer so M-Pesa and other methods plug in without touching the booking code.
- lib/payments/index.js: one function `startPayment(bookingId, method, phone, amount)` that picks a provider.
- lib/payments/manual.js: the office types amount + M-Pesa code (build this FIRST, it always stays as a fallback).
- lib/payments/mpesa.js: Safaricom Daraja STK Push (customer gets a PIN prompt on their phone).
- Later, same shape: lib/payments/card.js (a Kenyan gateway such as Pesapal, Flutterwave or IntaSend; check current fees and terms before choosing), Airtel Money, etc.
- Every provider exposes `start()` and `handleCallback()`. Nothing outside lib/payments knows which provider was used.
Payments table: id, booking_id, provider, method, amount, phone, status (initiated/pending/success/failed/cancelled), provider_ref (e.g. CheckoutRequestID), receipt_code (e.g. M-Pesa code), raw_callback (JSON), created_at, confirmed_at. Callback handling must be idempotent (same callback twice = one payment). Booking status moves to deposit_paid / fully_paid only from a successful payment row, never from the browser.
Browser confirmation: the page calls POST /api/payments (shows "Check your phone and enter your M-Pesa PIN"), then polls GET /api/payments/:id every 2-3 seconds until status is success/failed, then shows the receipt. The browser only displays the result; the provider's callback to the server is the source of truth.
Daraja facts to respect: needs a Daraja developer account, consumer key and secret, shortcode (Paybill or Till) and passkey, all kept in a .env file that is never committed. The callback URL must be public HTTPS, so on localhost use a tunnel (ngrok or Cloudflare Tunnel) or a "simulate payment" button in development. Start in Daraja's sandbox, then go live with the client's real Paybill/Till. Verify current Daraja details in Safaricom's docs before coding.
Security: validate amounts server-side from the booking, never from the browser; log every callback; rate-limit payment attempts per phone; HTTPS only when live.
Build order addition: after step 6 (PDFs), add 6b payments: manual first, then simulated payment with browser polling, then real Daraja sandbox.

## Growth features (decided 20 Oct 2026, build after the core booking works)
### A. WhatsApp reminders (no WhatsApp Business API at first)
Office-side "message queue": the admin page shows who needs a message today, with a ready-written text and a "Send on WhatsApp" button (opens wa.me with the text). Templates, kept in one file (lib/messages.js) so wording and Kiswahili can be edited in one place:
1. Quote sent. 2. Deposit reminder (3 days after quote, if unpaid). 3. Deposit received / date held. 4. Balance reminder (7 days before event). 5. Event-week checklist (venue access, set-up time, contact person). 6. Thank you + private review link (day after event).
A daily check (a small script or a button "Who needs a message today?") builds the list from booking status and dates. Later, the same templates can go through the WhatsApp Business API with no other change.
### B. Local search pages (programmatic SEO)
Generate one page per search intent from a data file (data/seo-pages.json), not by hand: e.g. "Tent hire in Kilifi", "Wedding décor in Malindi", "Ruracio / dowry décor in Kilifi", "Chiavari chair hire Kilifi", "Photobooth hire Kilifi", "Birthday party décor Mtwapa", "Stage and PA system hire". Each page needs: unique title and meta description, a real heading and 150+ words of useful text (what is included, price from the list, area served), real photos with alt text, the price list items that match, a "Build my quote" button, and LocalBusiness + FAQ schema markup. Also a generated sitemap.xml and robots.txt, and submit the sitemap in Google Search Console. Never copy the same text across pages with only the town name swapped; write each page's intro differently. Prices on these pages must come from the database so they never go stale.
Also: Google Business profile (fix the pin, add photos, link to the site) and a "Review us on Google" link.
Build order additions: 9 WhatsApp message queue; 10 local search pages.

## Budget finder (decided 20 Oct 2026; build right after step 3, quote and total)
Inspired by True Safari Adventure's "Search Packages" form (dropdowns for budget, nights, theme + Search). Our version, at the top of "Build your event" and on the home page:
- Fields: Event type (Wedding, Ruracio/Dowry, Birthday, Graduation, Funeral, Corporate, Other); Guests (number); Budget (tap a range or type an exact amount); Area (Kilifi town, Mnarani, Malindi, Watamu, Mtwapa, Mombasa, Other). Button: "Show what fits".
- Budget ranges in KES, as one-tap chips (not a dropdown; faster on phones): Below 30,000 / 30,000-50,000 / 50,000-100,000 / 100,000-200,000 / 200,000-300,000 / Above 300,000. Ranges live in the database settings, not in code.
- Result: packages that fit, best fit first, each showing "uses KES X of your budget". Packages slightly over stay visible, marked "KES X over" with a suggestion of what to remove. Packages scale with guests (seats, tables and tents per guest count come from package rules, not fixed numbers).
- Quote drawer budget bar: "KES 62,000 of 80,000 used, 18,000 left"; gold near the limit, warning when over (customer may still go over). "Often added" suggests items that fit the money left.
- The booking stores budget_min, budget_max (or exact budget), guests and event type; the admin booking page shows the budget beside the quote total.
- Every field is optional: a customer can skip straight to choosing items.

## Real packages (added 20 Oct 2026)
Use db/packages-2024.json for the prototype (from docs/rate-card-2024.pdf, an OLD 2024 card; the client will send the updated one, so prices must be easy to change from the admin page). It replaces the Starter/Deluxe/Premium examples:
- White Wedding: Basic Celebration 40,000; Elegant Gathering 50,000; Deluxe Event 60,000; Premium Celebration 80,000; Ultimate Event Experience 100,000.
- Church: Package 1 10,000; Package 2 15,000.
- Malozi / Kuhaswa: Basic 35,000; Elegant 45,000; Deluxe 60,000; Premium 80,000; Ultimate 100,000.
- Hire: 100-seater tent 3,500; 50-seater tent 2,500; gazebo 1,500; white armless chair 20 each.
Rules from the card: all packages can be customised; round tables are included; packages EXCLUDE tents and chairs (the price is the décor; tents and chairs are hired on top, so the quote must add them, e.g. by guest count). Banquet and Chiavari chairs available.
Packages have a fixed price plus an "includes" list of text lines (not item rows). Customising a package = package price plus extra items from the price list; removing a package line is a note for the office, not an automatic discount.
Event types (from the card): Malozi/Kuhaswa, Wedding, Church, Baby Shower, Birthday, Graduation, Farewell, Corporate.
Price conflicts to ask the office about: tents (card: 50-seater 2,500, 100-seater 3,500; spreadsheet: 80-seater 3,000, 100-seater draped canopy 3,500) and chairs (card: 20 per white armless chair; spreadsheet: dressed plastic 100, chiavari 250).
Budget finder ranges, updated to fit these packages: Below 20,000 / 20,000-40,000 / 40,000-60,000 / 60,000-80,000 / 80,000-100,000 / Above 100,000 (plus tents and chairs).

## Hosting (decided 20 Oct 2026)
Do not use Netlify for this system. Build and test on localhost. When going live: the Node server runs on a host Timothy controls (a VPS or a Node-capable host), behind HTTPS, with daily backups of data/mnyazi.db kept off the server, secrets only in .env, the admin page behind a password, and Node kept updated. Keep the code host-neutral: no host-specific features.

## Privacy, repo and deployment (decided 20 Oct 2026)
- Customer data never goes to GitHub: data/ (the database) and .env are in .gitignore. Keep it that way; never commit backups or exports of the database.
- The GitHub repo should be PRIVATE (source code and the client's rate card are business information).
- The live host does NOT connect to GitHub. Deploy by uploading a release (zip of the code, without data/, node_modules/ or .env) through the host's file manager or SFTP, then `npm install --omit=dev` on the server. The server's .env and data/ are created on the server and stay there.
- Candidate host: Truehost Kenya (cPanel lists Node.js support, free SSL, daily backups). Confirm with them before buying: running a long-lived Node.js app, Node 22.13+ (node:sqlite), files kept between restarts, SSH access.
## Google Search and favicon
- Favicon set is in public/icons + public/favicon.ico + public/site.webmanifest; every new page copies the same <head> icon lines from index.html.
- public/robots.txt blocks /admin/, /status/, /review/ and /api/ from search. Add the Sitemap line once the real domain is known.
- Going live checklist for Google: own domain (e.g. mnyazidreamdecor.co.ke), HTTPS, unique <title> and meta description per page, sitemap.xml, verify the site in Google Search Console and submit the sitemap, link the site from the Google Business Profile, LocalBusiness schema on the homepage. Private pages (status, review, admin) get <meta name="robots" content="noindex">.
