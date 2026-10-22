// payments/store.js: all the SQL for payments (the "payments" table in db/schema.sql).
//
// One job: read and write payment rows. Only the files in lib/payments use it.
//   addPayment(row)                   -> new row, gives back its id
//   markResult(providerRef, result)   -> pending -> success/failed, ONLY ONCE (idempotent, see below)
//   getPayment(id), listPayments(bookingId), paidSoFar(bookingId)
//   findSuccessByReceipt(code)        -> has this M-Pesa code been recorded already?
//   getBookingForPayment(bookingId)   -> status and totals of the booking being paid
//   setBookingStatus(bookingId, status)

const { openDatabase } = require('../../db/connection');
const { getLines, totalsFor } = require('../bookings');

const db = openDatabase();

function addPayment(row) {
  // Postgres note: ? becomes $1 ..., datetime('now') becomes now()
  return db.prepare(`
    INSERT INTO payments (booking_id, provider, method, amount, phone, status, provider_ref, receipt_code, raw_callback, confirmed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'success' THEN datetime('now') END)
    RETURNING id
  `).get(row.bookingId, row.provider, row.method, row.amount, row.phone || null, row.status,
         row.providerRef || null, row.receiptCode || null, row.raw ? JSON.stringify(row.raw) : null, row.status).id;
}

// IDEMPOTENT (CLAUDE.md): the same callback twice must count as ONE payment.
// "WHERE status IN ('initiated', 'pending')" means only a payment that is still waiting can change.
// The second time the same callback arrives, nothing matches, changes = 0, and we know it was a repeat.
function markResult(providerRef, result) {
  const change = db.prepare(`
    UPDATE payments
    SET status = ?, receipt_code = ?, raw_callback = ?, confirmed_at = datetime('now')
    WHERE provider_ref = ? AND status IN ('initiated', 'pending')
  `).run(result.status, result.receiptCode || null, JSON.stringify(result.raw || {}), providerRef);
  const payment = db.prepare('SELECT * FROM payments WHERE provider_ref = ?').get(providerRef);
  return { changed: change.changes > 0, payment: payment || null };
}

function getPayment(id) {
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id) || null;
}

function listPayments(bookingId) {
  return db.prepare(`
    SELECT id, provider, method, amount, phone, status, receipt_code, created_at, confirmed_at
    FROM payments WHERE booking_id = ? ORDER BY id
  `).all(bookingId);
}

// Only SUCCESSFUL payments count. COALESCE(..., 0) = 0 when there are none yet.
function paidSoFar(bookingId) {
  return db.prepare("SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE booking_id = ? AND status = 'success'").get(bookingId).paid;
}

function findSuccessByReceipt(code) {
  return db.prepare("SELECT id, booking_id FROM payments WHERE receipt_code = ? AND status = 'success'").get(code) || null;
}

function getBookingForPayment(bookingId) {
  const booking = db.prepare('SELECT id, booking_no, status, phone, transport_fee, discount, deposit_percent FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) { return null; }
  const totals = totalsFor(booking, getLines(bookingId));
  return Object.assign({}, booking, { total: totals.total, deposit: totals.deposit, pendingCount: totals.pendingCount });
}

function setBookingStatus(bookingId, status) {
  db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, bookingId);
}

module.exports = { addPayment, markResult, getPayment, listPayments, paidSoFar, findSuccessByReceipt, getBookingForPayment, setBookingStatus };
