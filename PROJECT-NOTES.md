# Mnyazi Dream Decor: booking system prototype

Owner/developer: Timothy Masha Kifalu (learning web development; explain every step simply).
Status: UI/UX design done, interactive front-end prototype done, back end not started.

## Client
- Mnyazi Dream Decor, event tents, décor, stages, sound
- Along St Thomas – Prison Road, Kilifi
- Phone / WhatsApp: 0793 463 223 (254793463223)
- Brand: navy #15224A, gold #C9A227. Fonts: Marcellus (headings), Manrope (text)
- Old free preview site (Netlify, not the real system): https://mnyazi-dream-decor.netlify.app

## What the system must do
1. Customers pick items. Unit price x quantity = line total. Running total.
2. Packages: Starter, Deluxe, Premium (contents and prices still to be confirmed by the client).
3. Custom items: customer types an item we don't list; it appears on the quote as "price pending" and the office replies.
4. Booking produces a quote / invoice (PDF) with a number like MDD-2026-0142.
5. Admin page for the office: booking requests, one booking (price custom items, transport, discount, record M-Pesa payment, notes), items and prices, packages.
6. Deposit 50% (to confirm), paid by M-Pesa.

## Design references (made with Claude)
- Canva website design (AI rebuild of the design, may differ slightly): https://canva.link/25st1nb3959i2xb
- Master design canvas (9 screens: customer flow, A4 quote, 3 admin screens): https://claude.ai/artifact/1XuUjiLADzjjwzgCHpZSEn
- Interactive front-end prototype (hero reel, sideways gallery, animated item cards, quote drawer): https://claude.ai/artifact/E29n9h645nzkPRrL2uFSDd
  Source file: booking-prototype/src.html (photos are placeholders {{IMG:event-1}} etc.)
- Inspiration: SimplyBook.me case study of The Table Service (custom pages, categories, add-ons, intake forms, deposits, notifications).

## Tech stack
HTML + CSS + plain JavaScript (no Tailwind, no framework) / Node.js + Express / SQLite / PDFKit for PDF quotes / password + session cookie for admin / photos in a folder. Hosting decided 20 Oct 2026: NOT Netlify. When going live, host the Node server on a server Timothy controls (a VPS, or a Node-capable host), with HTTPS, daily database backups and secrets in .env. Choose the host before step 6b (M-Pesa needs a public HTTPS address).

## Build order (one layer at a time, run and test each)
1. Database: db/schema.sql (items, categories, packages, package_items, bookings, booking_lines, custom_requests, payments), db/seed.sql from the price list
2. Price list on the page from the database (routes/items.js)
3. Quote and total
4. Save a booking (routes/bookings.js)
5. Admin page (routes/admin.js)
6. PDF quote (lib/quote-pdf.js)
Also produce a PDF learning book: every file and every SQL statement explained, with a "try this" change per chapter.

## Price list
48 items in for_website_demo.xlsx (keep it in the repo). Data issues to confirm with the office:
- "Photobooth (3-Phase)" appears twice (both 15,000)
- Two "Half-Moon Glass Table" rows: 10,000 and 5,000
- Stock counts (only 80-seater tent known: 7)

## Waiting on the client
Package contents and prices; stock counts; deposit %; M-Pesa Paybill/Till; transport fees; admin contacts; item photos; per-day pricing; exact office map pin.

## Rules for the assistant
- Beginner-friendly: explain code line by line, no unexplained pasted code.
- Keep data in the database, not in the code. One job per file. Reuse functions.
- Commit after each working step.
- Original full-size photos/video are in the repo (the first photos were only 163 px wide).

## Documents and reviews (decided 20 Oct 2026)
See CLAUDE.md for the quote, invoice, receipt flow, WhatsApp sending and the reviews design.

## Growth and maintenance (20 Oct 2026)
- WhatsApp reminder queue and local search pages: see CLAUDE.md "Growth features".
- Monthly care plans offer for Mnyazi: written as a Docs document (Timothy has the link). Suggested plans: Care 2,000 KES/month, Care Plus 3,000, Growth 5,000 (prices are Timothy's to confirm).

## Rate card (20 Oct 2026)
Old 2024 rate card received: docs/rate-card-2024.pdf, data in db/packages-2024.json. Use for the prototype; the updated card is coming from the client. See CLAUDE.md "Real packages".

## Future update, version 2 (parked 22 Oct 2026): Timothy builds these himself once he has more experience
### Lessons from other sites
What we studied and what to borrow. Earlier ones are already above: SimplyBook.me case study (categories, add-ons, intake form, deposits, notifications), True Safari Adventure (budget finder), Zoho "build systems not websites" video (WhatsApp reminders, local search pages, monthly care).

### Sherehe Events "Plan my event" (shereheevents.co.ke/plan-my-event) - the best model for our Build page
- One question at a time (a step-by-step planner), not one long form. Start by choosing a starting point: an occasion, a ready package, a few single items, or "something custom".
- Guest count drives guest-linked items: chairs, tables, linen, table settings and tents resize as soon as guests change. Items the customer set by hand stay as set, and the page says what changed ("Chairs went from 100 to 150"). Our package_items.per_guests already supports this; add a "set by customer" flag on cart lines.
- Packages priced by guest count in a table (20 / 50 / 100 / 150 / 200 guests), set-up and collection included, delivery added separately. Show Mnyazi's packages the same way once the rules are confirmed.
- Delivery priced by area: exact for areas the office has priced, marked "estimate" elsewhere. Needs a delivery_areas table (area, fee, is_exact) the office edits.
- Running "Quote list" + estimate + the 50% deposit always visible.
- Custom request can include photos and a budget.
- Finish with "Send on WhatsApp" or "Ask us to call me".
- "Save & share" with no sign-up: a short code + link; the estimate stays on the customer's phone; anyone opening the link gets their own copy to change. (Store the cart in localStorage plus a share code saved on the server.)
- States the hire period (24 hours) and loads today's prices from the server.

### Smart Ushering (smartushering.lovable.app) - built with the Lovable AI builder
- Has a "Track" page: call our private status page "Track my booking" in menus and messages.
- Has a separate "Concerns" page for complaints: consider one for Mnyazi (goes to the admin inbox).
- Leaves an "Edit with Lovable" badge: never ship builder badges or placeholder text.
- Our edge to keep: real quotes, packages, payments, PDFs, reminders, data on a server we control.

### Suggested order if we ever build them
1 guest-count resizing with "what changed" note; 2 planner-style steps on the Build page (starting point first); 3 delivery areas with exact/estimate fees; 4 Save & share code; 5 "Ask us to call me" option; 6 rename status page to Track my booking; 7 Concerns page.
