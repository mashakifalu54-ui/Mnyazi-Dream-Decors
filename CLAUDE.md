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
Brand navy #15224A, gold #C9A227, fonts Marcellus + Manrope. Design files in design-canvas/, interactive front-end in booking-prototype/src.html, Canva link in PROJECT-NOTES.md. Use the original full-size photos and video in the repo.

## Build order
1 database + seed from for_website_demo.xlsx; 2 price list from DB; 3 quote and total; 4 save booking; 5 admin page (bookings, one booking, items/prices, packages); 6 PDFs (quote, invoice, receipt); 7 reviews; 8 PDF learning book (every file and SQL statement, with a "try this" change per chapter).
