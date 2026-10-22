// office.js: what the office does with booking requests on the admin page.
//
// One job: managing bookings. All the SQL for it is here (routes/admin.js has none):
//   getDashboard()                    -> the numbers at the top of the admin page
//   listBookings(filter)              -> the table of booking requests
//   getBookingForOffice(id)           -> one booking: client, event, lines, stock on the event date, totals
//   saveOfficeChanges(id, changes)    -> prices for custom items, available or not, transport, discount, notes
//   changeStatus(id, action, reason)  -> confirm the quote, decline, cancel, mark completed

const { openDatabase } = require('../db/connection');
const { getLines, totalsFor, kenyaToday } = require('./bookings');
const payments = require('./payments');

const db = openDatabase();

// Bookings that still hold stock on their date (declined, cancelled and finished ones don't)
const ACTIVE = "('new', 'needs_price', 'quoted', 'deposit_paid', 'fully_paid')";

// Which filter shows which statuses
const FILTERS = {
  attention: ['new', 'needs_price'],
  waiting: ['quoted'],
  confirmed: ['deposit_paid', 'fully_paid'],
  done: ['completed', 'declined', 'cancelled']
};


// ---------- Numbers at the top ----------
function getDashboard() {
  const count = (sql, ...values) => db.prepare(sql).get(...values).n;
  const month = kenyaToday().slice(0, 7);   // '2026-10'
  return {
    needReply: count("SELECT COUNT(*) AS n FROM bookings WHERE status IN ('new', 'needs_price')"),
    customItems: count("SELECT COUNT(*) AS n FROM bookings WHERE status = 'needs_price'"),
    waitingDeposit: count("SELECT COUNT(*) AS n FROM bookings WHERE status = 'quoted'"),
    // events this month that are confirmed. substr(text, 1, 7) = the first 7 letters: '2026-10' (Postgres: same word)
    confirmedThisMonth: count("SELECT COUNT(*) AS n FROM bookings WHERE status IN ('deposit_paid', 'fully_paid') AND substr(event_date, 1, 7) = ?", month)
  };
}


// ---------- The table of bookings ----------
// filter: 'attention' (default), 'waiting', 'confirmed', 'done' or 'all'
function listBookings(filter) {
  const statuses = FILTERS[filter] || (filter === 'all' ? null : FILTERS.attention);

  // Build "IN (?, ?)" with one ? per status, then pass the statuses as the values (never glued into the SQL)
  const where = statuses ? 'WHERE status IN (' + statuses.map(() => '?').join(', ') + ')' : '';
  const bookings = db.prepare(`
    SELECT id, booking_no, status, customer_name, phone, event_type, event_date, area,
           transport_fee, discount, deposit_percent, created_at
    FROM bookings
    ${where}
    ORDER BY event_date, id
  `).all(...(statuses || []));

  return bookings.map(function (booking) {
    const lines = getLines(booking.id);
    const totals = totalsFor(booking, lines);
    return {
      id: booking.id,
      bookingNo: booking.booking_no,
      status: booking.status,
      customerName: booking.customer_name,
      phone: booking.phone,
      eventType: booking.event_type,
      eventDate: booking.event_date,
      area: booking.area,
      receivedAt: booking.created_at,
      lineCount: lines.length,
      pendingCount: totals.pendingCount,
      total: totals.total
    };
  });
}


// ---------- One booking ----------
function getBookingForOffice(id) {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!booking) { return null; }

  const lines = getLines(booking.id);

  // For each price-list item: how many we own, and how many OTHER active bookings already have on the same date
  const bookedElsewhere = db.prepare(`
    SELECT COALESCE(SUM(booking_lines.qty), 0) AS qty
    FROM booking_lines
    JOIN bookings ON bookings.id = booking_lines.booking_id
    WHERE booking_lines.item_id = ?
      AND bookings.event_date = ?
      AND bookings.id <> ?
      AND bookings.status IN ${ACTIVE}
      AND booking_lines.status <> 'unavailable'
  `);
  const stockOf = db.prepare('SELECT stock_count FROM items WHERE id = ?');

  const withStock = lines.map(function (line) {
    if (line.kind !== 'item') { return Object.assign({}, line, { stock: null, bookedElsewhere: null }); }
    return Object.assign({}, line, {
      stock: stockOf.get(line.item_id).stock_count,                                         // null = not known yet
      bookedElsewhere: bookedElsewhere.get(line.item_id, booking.event_date, booking.id).qty
    });
  });

  return {
    id: booking.id,
    bookingNo: booking.booking_no,
    status: booking.status,
    customerName: booking.customer_name,
    phone: booking.phone,
    eventType: booking.event_type,
    eventDate: booking.event_date,
    guests: booking.guests,
    area: booking.area,
    notes: booking.notes,
    budgetMin: booking.budget_min,
    budgetMax: booking.budget_max,
    transportFee: booking.transport_fee,
    discount: booking.discount,
    depositPercent: booking.deposit_percent,
    officeNotes: booking.office_notes,
    statusToken: booking.status_token,   // the office needs it to send the private link on WhatsApp
    receivedAt: booking.created_at,
    lines: withStock,
    quote: totalsFor(booking, lines),
    payments: payments.paymentSummary(booking.id)   // paid so far, left to pay, every payment
  };
}


// ---------- Save the office's changes ----------
// changes = { transportFee, discount, officeNotes, lines: [ { id, unitPrice, status } ] }
// Only lines of THIS booking can be changed, and only price/status (never quantity or item).
function saveOfficeChanges(id, changes) {
  const booking = db.prepare('SELECT id, status FROM bookings WHERE id = ?').get(id);
  if (!booking) { return { error: 'Booking not found.' }; }
  if (['completed', 'declined', 'cancelled'].includes(booking.status)) {
    return { error: 'This booking is closed. Nothing can be changed.' };
  }
  changes = changes || {};

  // Once money has been paid, the prices are what the customer paid against: only notes can change
  if (['deposit_paid', 'fully_paid'].includes(booking.status)) {
    const notes = String(changes.officeNotes || '').trim().slice(0, 2000) || null;
    db.prepare("UPDATE bookings SET office_notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes, id);
    return { ok: true };
  }

  const money = (value, label) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 10000000) { throw new Error(label + ': use a whole number of shillings (0 or more).'); }
    return n;
  };

  try {
    const transportFee = money(changes.transportFee || 0, 'Transport');
    const discount = money(changes.discount || 0, 'Discount');
    const notes = String(changes.officeNotes || '').trim().slice(0, 2000) || null;

    const lineIds = new Set(getLines(id).map((line) => line.id));
    const updates = (Array.isArray(changes.lines) ? changes.lines : []).map(function (line) {
      if (!lineIds.has(Number(line.id))) { throw new Error('A line does not belong to this booking. Please reload the page.'); }
      const status = ['ok', 'pending', 'unavailable'].includes(line.status) ? line.status : 'ok';
      const price = line.unitPrice === '' || line.unitPrice == null ? null : money(line.unitPrice, 'Price');
      // A line that is "ok" must have a price; "pending" is a custom item still waiting for one
      if (status === 'ok' && price === null) { throw new Error('Every available line needs a price (or mark it "Not available").'); }
      return { id: Number(line.id), price: price, status: price === null && status !== 'unavailable' ? 'pending' : status };
    });

    db.exec('BEGIN');
    db.prepare("UPDATE bookings SET transport_fee = ?, discount = ?, office_notes = ?, updated_at = datetime('now') WHERE id = ?")
      .run(transportFee, discount, notes, id);
    // Postgres note: datetime('now') becomes now()
    const setLine = db.prepare('UPDATE booking_lines SET unit_price = ?, status = ? WHERE id = ? AND booking_id = ?');
    updates.forEach((u) => setLine.run(u.price, u.status, u.id, id));

    // Keep the status honest: still waiting for a price -> needs_price; all priced -> new
    const stillPending = db.prepare("SELECT COUNT(*) AS n FROM booking_lines WHERE booking_id = ? AND status = 'pending'").get(id).n;
    if (booking.status === 'needs_price' && stillPending === 0) {
      db.prepare("UPDATE bookings SET status = 'new' WHERE id = ?").run(id);
    }
    if (booking.status === 'new' && stillPending > 0) {
      db.prepare("UPDATE bookings SET status = 'needs_price' WHERE id = ?").run(id);
    }
    db.exec('COMMIT');
    return { ok: true };
  } catch (error) {
    if (db.isTransaction) { db.exec('ROLLBACK'); }
    return { error: error.message };
  }
}


// ---------- Change the status ----------
// Which action is allowed from which status (CLAUDE.md status list):
//   confirm:  new -> quoted            ("Confirm & send quote"; only when nothing is waiting for a price)
//   decline:  new / needs_price -> declined   (with a reason, kept in the office notes)
//   cancel:   quoted / deposit_paid / fully_paid -> cancelled
//   complete: deposit_paid / fully_paid -> completed   (after the event)
// deposit_paid and fully_paid come ONLY from payments (build step 6b), never from a button.
const ACTIONS = {
  confirm: { from: ['new'], to: 'quoted' },
  decline: { from: ['new', 'needs_price'], to: 'declined' },
  cancel: { from: ['quoted', 'deposit_paid', 'fully_paid'], to: 'cancelled' },
  complete: { from: ['deposit_paid', 'fully_paid'], to: 'completed' }
};

function changeStatus(id, action, reason) {
  const rule = ACTIONS[action];
  if (!rule) { return { error: 'Unknown action.' }; }
  const booking = db.prepare('SELECT id, status, office_notes FROM bookings WHERE id = ?').get(id);
  if (!booking) { return { error: 'Booking not found.' }; }
  if (!rule.from.includes(booking.status)) {
    return { error: booking.status === 'needs_price' && action === 'confirm'
      ? 'Price every custom item (or mark it "Not available") and save first.'
      : 'This can\'t be done while the booking is "' + booking.status.replace('_', ' ') + '".' };
  }

  // A reason (for declining or cancelling) is added to the office notes with the date
  let notes = booking.office_notes;
  const why = String(reason || '').trim().slice(0, 500);
  if (why) { notes = (notes ? notes + '\n' : '') + kenyaToday() + ' ' + rule.to + ': ' + why; }

  db.prepare("UPDATE bookings SET status = ?, office_notes = ?, updated_at = datetime('now') WHERE id = ?").run(rule.to, notes, id);
  return { ok: true, status: rule.to };
}


module.exports = { getDashboard, listBookings, getBookingForOffice, saveOfficeChanges, changeStatus };
