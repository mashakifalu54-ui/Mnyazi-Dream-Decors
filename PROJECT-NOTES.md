# Mnyazi Dream Decor: booking system prototype

Owner/developer: Timothy Masha Kifalu (learning web development; explain every step simply).
Status: UI/UX design done, interactive front-end prototype done, back end not started.

## Client
- Mnyazi Dream Decor, event tents, décor, stages, sound
- Along St Thomas – Prison Road, Kilifi
- Phone / WhatsApp: 0793 463 223 (254793463223)
- Brand: navy #15224A, gold #C9A227. Fonts: Marcellus (headings), Manrope (text)
- Preview site: https://mnyazi-dream-decor.netlify.app

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
HTML + CSS + plain JavaScript (no Tailwind, no framework) / Node.js + Express / SQLite / PDFKit for PDF quotes / password + session cookie for admin / photos in a folder. Later: Supabase or Neon + Netlify.

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
