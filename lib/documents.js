// documents.js: gathers everything a QUOTE or INVOICE needs (CLAUDE.md "Document flow").
//
// One job: the CONTENT of the documents. Drawing them is lib/pdf.js; this file never draws.
//   documentTypeFor(status)          -> 'quote' or 'invoice'
//   getDocumentData(bookingId, type) -> everything to print, or null
//   getReceiptData(paymentId)        -> everything for a RECEIPT (one per successful payment), or null
//
// Documents are never typed by hand: they are made from the booking every time someone downloads one,
// so they always show the latest prices, transport and discount the office saved.
//   QUOTE   while the office is still checking  (status new / needs_price)
//   INVOICE once the office has confirmed         (status quoted and later)
//   RECEIPT one for each successful payment: shows paid so far and balance left

const office = require('./office');
const { getSetting } = require('./settings');
const { kenyaToday } = require('./bookings');
const { prettyKenyanPhone } = require('../public/js/kenya-phone');
const payments = require('./payments');

function documentTypeFor(status) {
  return ['new', 'needs_price', 'declined'].includes(status) ? 'quote' : 'invoice';
}

// '2026-12-12' -> '12 December 2026'
function longDate(dateText) {
  return new Date(dateText.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function addDays(dateText, days) {
  const date = new Date(dateText + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDocumentData(bookingId, type) {
  const b = office.getBookingForOffice(bookingId);
  if (!b) { return null; }
  type = type === 'invoice' ? 'invoice' : 'quote';

  const today = kenyaToday();
  const validDays = Number(getSetting('quote_valid_days') || 14);
  const paybill = getSetting('mpesa_paybill');          // empty until the client gives us their Paybill/Till
  const balanceDays = getSetting('balance_due_days');   // empty until the client decides

  // On an invoice, lines the office marked "not available" are left out; on a quote they show as such
  const lines = b.quote.lines
    .filter((line) => type === 'quote' || line.status !== 'unavailable')
    .map((line) => ({
      name: line.name,
      qty: line.qty,
      unitPrice: line.unit_price,                 // null = price pending
      total: line.line_total,                     // null = price pending or not available
      note: line.status === 'unavailable' ? 'Not available' : (line.unit_price == null ? 'Price pending' : null)
    }));

  const terms = [
    'Your date is held once the deposit is received.',
    balanceDays ? 'The balance is due ' + balanceDays + ' days before the event.' : 'The balance is due before set-up day.',
    type === 'quote' ? 'Prices are valid for ' + validDays + ' days.' : 'Prices are for one event day.',
    'Transport outside Kilifi town is added by the office.'
  ];

  return {
    type: type,
    title: type === 'quote' ? 'QUOTE' : 'INVOICE',
    number: b.bookingNo,
    issued: longDate(today),
    validUntil: type === 'quote' ? longDate(addDays(today, validDays)) : null,
    business: {
      name: getSetting('business_name') || 'Mnyazi Dream Decor',
      address: getSetting('address') || '',
      phone: getSetting('phone') || ''
    },
    client: { name: b.customerName, phone: prettyKenyanPhone(b.phone) },
    event: {
      type: b.eventType,
      date: longDate(b.eventDate),
      area: b.area,
      guests: b.guests,
      notes: b.notes
    },
    lines: lines,
    totals: {
      subtotal: b.quote.subtotal,
      transport: b.quote.transportFee,
      discount: b.quote.discount,
      total: b.quote.total,
      depositPercent: b.depositPercent,
      deposit: b.quote.deposit,
      balance: b.quote.balance,
      pendingCount: b.quote.pendingCount
    },
    payment: paybill
      ? 'M-Pesa Paybill ' + paybill + ', account ' + b.bookingNo
      : 'The office sends the M-Pesa payment details on WhatsApp.',
    terms: terms,
    statusToken: b.statusToken
  };
}

// ---------- Receipt ----------
// Number: the booking number + R1, R2 ... in the order the payments succeeded (MDD-2026-0001-R2)
function getReceiptData(paymentId) {
  const payment = payments.getPayment(paymentId);
  if (!payment || payment.status !== 'success') { return null; }
  const base = getDocumentData(payment.booking_id, 'invoice');
  const summary = payments.paymentSummary(payment.booking_id);

  // Only payments up to and including this one: a receipt never changes later
  const upToThis = summary.payments.filter((p) => p.status === 'success' && p.id <= payment.id);
  const paidSoFar = upToThis.reduce((sum, p) => sum + p.amount, 0);

  return Object.assign({}, base, {
    type: 'receipt',
    title: 'RECEIPT',
    number: base.number + '-R' + upToThis.length,
    issued: longDate(payment.confirmed_at || payment.created_at),
    validUntil: null,
    receipt: {
      amount: payment.amount,
      method: payment.method || 'M-Pesa',
      code: payment.receipt_code,
      bookingNo: base.number,
      bookingTotal: base.totals.total,
      paidSoFar: paidSoFar,
      balanceLeft: Math.max(0, base.totals.total - paidSoFar)
    }
  });
}

module.exports = { documentTypeFor, getDocumentData, getReceiptData };
