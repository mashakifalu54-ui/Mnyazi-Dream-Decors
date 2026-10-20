# UI/UX prompt for Claude: Mnyazi Dream Decor booking site

Use this whenever you build or change any screen. Reference screens: design-canvas/ (9 screens), booking-prototype/src.html (working interactive page), Canva link in PROJECT-NOTES.md. When code and this prompt disagree, this prompt wins.

## The feeling
Premium coastal event house. Calm, confident, warm. A bride's mother on a phone in Kilifi should feel "these people are professional" within three seconds, and should be able to build a quote without asking anyone. Photos do the selling; the interface stays quiet around them. Modern, not trendy: no gimmicks that slow the page.

## Look
- Palette: deep navy #15224A, gold #C9A227 as the single accent, warm off-white background, navy-tinted neutrals (never pure grey). Gold is for the one action that matters on each screen (Add, Send request, Pay).
- Type: Marcellus for headings (large, generous), Manrope for everything else. One type scale, used consistently. Body 16px minimum. Prices bold, tabular numbers so columns line up.
- Shape: soft but not bubbly. Pill buttons and chips, 14px card radius, big photos with small corner radius. Plenty of white space. One shadow style, used sparingly.
- Photography first: full-width hero, big item photos, real event photos only. No stock images. Dark gradient over hero photos for readable text.
- Light and dark mode both designed, not inverted. In dark mode gold becomes the primary button.

## Motion (purposeful, one idea per place)
- Hero: slow photo reel (or the event video, muted, looping) with gentle zoom and a thin progress bar; pause button always visible.
- Scroll: sections rise and fade in once; the hero photo moves slower than the page (parallax); the gallery moves sideways while you scroll down on desktop and swipes natively on phones. Tap any photo for a full-screen viewer with swipe and arrow keys.
- Item cards: photo zooms slightly on hover; "Add" flies a small copy of the photo into the quote button; the total counts up to its new value.
- Everything respects prefers-reduced-motion (motion off, content still fully visible). Never hide content behind an animation that might not run.

## Experience rules
- Mobile first. Design at 390px wide, then enlarge. Thumb-reachable controls, 44px minimum touch targets, quote button always visible (floating button on phones, sticky summary on desktop).
- Price clarity: every item shows "unit price x quantity = line total"; the running total and the 50% deposit are always visible; nothing is hidden until checkout.
- Budget finder first: event type, guests, budget (one-tap KES range chips or an exact amount), area, then "Show what fits". Budget bar in the quote drawer. Everything optional.
- Always-visible contact: floating WhatsApp and Call buttons on every customer page (bottom right, clear of the quote button). On phones, consider a bottom bar: Home, Build, Packages, Quote, Call.
- Flow: choose items or a package -> quote drawer -> event details -> sent. Four steps, a visible step indicator, back never loses data.
- Custom item request is a normal part of the page, not an error state: "price pending" shown in a gold-tinted row, with a promise of a reply from the office.
- Forms: only ask what the office needs (name, Kenyan phone, event, date, area, notes). Validate Kenyan numbers (07xx, 01xx, +254) and future dates, with plain-language errors next to the field. No email required.
- Status page for the client (private link): shows the booking number, a simple timeline (received, checked, quote sent, deposit paid, confirmed), the PDFs, and a "Pay deposit" button. After payment, the page confirms by itself without a refresh.
- Reviews: only from a private link after the event; shown as first name, event type, stars, "Verified booking".
- Trust: show the office address, phone and WhatsApp on every page, a "visit our office" line, and real reviews.
- Language: simple English with Kiswahili labels ready to add (keep all text in one place so translation is easy). Short sentences, active voice, no jargon. Buttons say exactly what happens: "Add", "Send booking request", "Pay deposit".

## Performance and data (Kenyan phones)
Compress photos (max about 1600px wide, WebP/JPEG, under 250 KB each) and lazy-load everything below the first screen. Hero video under 5 MB with a poster image, never autoplay with sound. Page should be usable on a slow 3G connection within about 3 seconds. No heavy libraries; plain CSS and JavaScript.

## Accessibility
Real buttons and labels, visible focus ring in gold, contrast AA or better in both themes, alt text on every photo, keyboard-usable drawer and gallery (Escape closes), forms announce errors.

## Admin (office, laptop)
Calmer and denser than the customer site: navy sidebar, status chips (New, Custom item, Waiting deposit, Confirmed), big numbers for what needs attention, one booking per page with the client, event, lines, availability on the event date, a price box for custom items, a payment box, and notes. Large clear buttons: "Confirm & send quote", "Record payment", "Send on WhatsApp". Works on a phone too, because the office will use it on the go.

## Do not
Carousels that auto-advance without a pause control; popups on page load; tiny grey text; stock photos; more than one accent colour; centring everything; emoji as icons; animation that delays the user from pressing Add; generic template look.
