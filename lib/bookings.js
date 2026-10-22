// bookings.js: saves a booking request and reads it back for the customer's status page.
//
// One job: everything about storing bookings. ALL the booking SQL lives here (CLAUDE.md):
//   createBooking(choice, details, options) -> { bookingId, bookingNo, token }  or  { error }
//     options.source = 'office' when the office books for a client (then today's date is allowed)
//   getBookingByToken(token)        -> the booking for the private status page, or null
//   getLines(bookingId), totalsFor(booking, lines)  -> shared with lib/office.js (the admin page)
//   getBookingIdByToken(token)      -> the booking's id, for the customer's PDF download
//
// The quote is priced again here with lib/quote.js, so the prices saved are the
// database prices, never numbers sent by the browser.

const crypto = require('node:crypto');
const { openDatabase } = require('../db/connection');
const catalogue = require('./catalogue');
const { buildQuote } = require('./quote');
const { getSetting } = require('./settings');
const { calculateQuote } = require('../public/js/quote-math');
const { normalizeKenyanPhone } = require('../public/js/kenya-phone');

const db = openDatabase();


// ---------- Small helpers ----------

// Today's date in Kenya as 'YYYY-MM-DD' ('en-CA' happens to write dates that way).
// We use Kenya time, not the server's clock zone, so "tomorrow" means tomorrow in Kilifi.
function kenyaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
}

// Adds days to a 'YYYY-MM-DD' date and gives back the same shape
function addDays(dateText, days) {
  const date = new Date(dateText + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Text from a form: remove spaces at the ends, cut to a maximum length, empty -> null
function cleanText(value, maxLength) {
  const text = String(value == null ? '' : value).trim().slice(0, maxLength);
  return text || null;
}

// A whole number inside a range, or null
function cleanNumber(value, min, max) {
  if (value === null || value === undefined || value === '') { return null; }
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}


// ---------- Check the event details (plain-words errors, like the form) ----------
function checkDetails(details, fromOffice) {
  details = details || {};
  const name = cleanText(details.name, 80);
  if (!name) { return { error: 'Please add your name.', field: 'name' }; }

  const phone = normalizeKenyanPhone(details.phone);
  if (!phone) { return { error: 'Use a Kenyan number like 0712 345 678 or +254 712 345 678.', field: 'phone' }; }

  const eventTypes = catalogue.getEventTypes().map((t) => t.name);
  const eventType = cleanText(details.eventType, 40);
  if (!eventTypes.includes(eventType)) { return { error: 'Please choose the type of event.', field: 'eventType' }; }

  // The date must look like YYYY-MM-DD, be from tomorrow (the office may also book for today), and within 2 years
  const date = cleanText(details.eventDate, 10);
  const tomorrow = addDays(kenyaToday(), fromOffice ? 0 : 1);
  const latest = addDays(kenyaToday(), 730);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < tomorrow || date > latest) {
    return { error: 'Pick an event date from ' + (fromOffice ? 'today' : 'tomorrow') + ' onwards.', field: 'eventDate' };
  }   // (comparing 'YYYY-MM-DD' texts works like comparing dates, because the biggest part comes first)

  const areas = catalogue.getAreas();
  const area = cleanText(details.area, 40);
  if (area && !areas.includes(area)) { return { error: 'Please choose the area from the list.', field: 'area' }; }

  const guests = cleanNumber(details.guests, 1, 5000);
  if (details.guests && guests === null) { return { error: 'Guests: use a whole number, for example 120.', field: 'guests' }; }

  // Budget from the budget finder (optional). An exact amount arrives as min = max.
  const budgetMin = cleanNumber(details.budgetMin, 0, 100000000);
  const budgetMax = cleanNumber(details.budgetMax, 0, 100000000);

  return {
    details: {
      name: name, phone: phone, eventType: eventType, eventDate: date, area: area,
      guests: guests, notes: cleanText(details.notes, 1000), budgetMin: budgetMin, budgetMax: budgetMax
    }
  };
}


// ---------- The next booking number: MDD-2026-0001, MDD-2026-0002 ... ----------
// It starts again at 0001 each year.
function nextBookingNo() {
  const prefix = (getSetting('booking_prefix') || 'MDD') + '-' + kenyaToday().slice(0, 4) + '-';   // 'MDD-2026-'
  // The highest number this year so far. LIKE 'MDD-2026-%' = starts with MDD-2026-
  const last = db.prepare('SELECT booking_no FROM bookings WHERE booking_no LIKE ? ORDER BY booking_no DESC LIMIT 1').get(prefix + '%');
  const lastNumber = last ? Number(last.booking_no.slice(prefix.length)) : 0;
  return prefix + String(lastNumber + 1).padStart(4, '0');   // padStart: 7 -> '0007'
}


// ---------- Save a booking ----------
// choice  = what was picked (same shape as POST /api/quote)
// details = the event details form
function createBooking(choice, details, options) {
  const source = options && options.source === 'office' ? 'office' : 'website';
  const checked = checkDetails(details, source === 'office');
  if (checked.error) { return checked; }
  const d = checked.details;

  const priced = buildQuote(choice);     // prices from the database
  if (priced.error) { return { error: priced.error }; }
  const quote = priced.quote;

  // A booking with a custom item starts as 'needs_price', otherwise 'new' (CLAUDE.md status list)
  const status = quote.pendingCount > 0 ? 'needs_price' : 'new';
  // A long random code for the private status page: 24 random bytes = 48 letters/numbers, impossible to guess
  const token = crypto.randomBytes(24).toString('hex');
  const depositPercent = Number(getSetting('deposit_percent') || 50);

  // TRANSACTION: the booking and ALL its lines are saved together, or nothing is saved.
  try {
    db.exec('BEGIN');
    const bookingNo = nextBookingNo();

    // RETURNING id = "give me back the id you just made" (works in SQLite and Postgres).
    // Postgres note: ? becomes $1, $2 ...
    const booking = db.prepare(`
      INSERT INTO bookings (booking_no, status, customer_name, phone, event_type, event_date,
                            guests, area, notes, budget_min, budget_max, deposit_percent, status_token, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).get(bookingNo, status, d.name, d.phone, d.eventType, d.eventDate,
           d.guests, d.area, d.notes, d.budgetMin, d.budgetMax, depositPercent, token, source);

    // One row per line. Exactly one of item_id / package_id / custom_name is filled in.
    const addLine = db.prepare(`
      INSERT INTO booking_lines (booking_id, item_id, package_id, custom_name, qty, unit_price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const line of quote.lines) {
      addLine.run(
        booking.id,
        line.kind === 'item' ? line.id : null,
        line.kind === 'package' ? line.id : null,
        line.kind === 'custom' ? line.name : null,
        line.qty,
        line.unit_price,                              // null for custom items: "price pending"
        line.kind === 'custom' ? 'pending' : 'ok'
      );
    }

    db.exec('COMMIT');
    return { bookingId: booking.id, bookingNo: bookingNo, token: token };
  } catch (error) {
    db.exec('ROLLBACK');   // undo everything from BEGIN
    throw error;           // server.js answers "Something went wrong" and prints the details
  }
}


// ---------- Read a booking for the customer's private status page ----------
function getBookingByToken(token) {
  if (!/^[0-9a-f]{48}$/.test(String(token))) { return null; }   // not even the right shape: don't ask the database

  const booking = db.prepare(`
    SELECT id, booking_no, status, customer_name, event_type, event_date, guests, area,
           transport_fee, discount, deposit_percent, created_at
    FROM bookings
    WHERE status_token = ?
  `).get(token);
  if (!booking) { return null; }

  const lines = getLines(booking.id);
  const totals = totalsFor(booking, lines);

  return {
    bookingNo: booking.booking_no,
    status: booking.status,
    firstName: booking.customer_name.split(' ')[0],   // only the first name: the link may be shared
    eventType: booking.event_type,
    eventDate: booking.event_date,
    guests: booking.guests,
    area: booking.area,
    receivedAt: booking.created_at,
    quote: totals
  };
}


// ---------- The booking id behind a private status code ----------
function getBookingIdByToken(token) {
  if (!/^[0-9a-f]{48}$/.test(String(token))) { return null; }
  const row = db.prepare('SELECT id, status FROM bookings WHERE status_token = ?').get(token);
  return row ? row : null;
}


// ---------- Shared: the lines of one booking ----------
// Each line with the name of the item or package it points to, and what kind of line it is.
// LEFT JOIN = keep the line even when there is no matching item (custom lines have no item).
// COALESCE(a, b, c) = the first one that is not empty.   || joins text (same in Postgres).
function getLines(bookingId) {
  return db.prepare(`
    SELECT booking_lines.id,
           CASE WHEN booking_lines.item_id IS NOT NULL THEN 'item'
                WHEN booking_lines.package_id IS NOT NULL THEN 'package'
                ELSE 'custom' END AS kind,
           booking_lines.item_id,
           COALESCE(items.name, packages.category || ': ' || packages.name, booking_lines.custom_name) AS name,
           booking_lines.qty, booking_lines.unit_price, booking_lines.status
    FROM booking_lines
    LEFT JOIN items    ON items.id    = booking_lines.item_id
    LEFT JOIN packages ON packages.id = booking_lines.package_id
    WHERE booking_lines.booking_id = ?
    ORDER BY booking_lines.id
  `).all(bookingId);
}

// ---------- Shared: totals for one booking ----------
// Lines the office marked "unavailable" are shown but not charged.
// The one totals function does the maths (CLAUDE.md: totals are never stored by hand).
function totalsFor(booking, lines) {
  const totals = calculateQuote(lines.filter((line) => line.status !== 'unavailable'), {
    depositPercent: booking.deposit_percent,
    transportFee: booking.transport_fee,
    discount: booking.discount
  });
  totals.lines = lines.map(function (line) {
    const unavailable = line.status === 'unavailable';
    return Object.assign({}, line, {
      line_total: unavailable || line.unit_price == null ? null : line.qty * line.unit_price
    });
  });
  return totals;
}


module.exports = { createBooking, getBookingByToken, getBookingIdByToken, getLines, totalsFor, kenyaToday };
