// routes/bookings.js: the web addresses for booking requests.
//
//   POST /api/bookings          the customer sends their picks + event details; we save the booking
//   GET  /api/status/:token     the private status page asks for its booking
//   GET  /api/status/:token/pdf the customer downloads their quote (or invoice, once confirmed)
//
// No SQL here (CLAUDE.md): the work is done in lib/bookings.js.

const express = require('express');
const { createBooking, getBookingByToken, getBookingIdByToken } = require('../lib/bookings');
const { documentTypeFor, getDocumentData } = require('../lib/documents');
const { writeDocumentPdf } = require('../lib/pdf');
const payments = require('../lib/payments');

const router = express.Router();

// A very small guard against someone sending hundreds of requests from one device (IP address):
//   at most 5 SAVED bookings and 30 attempts (including mistakes in the form) every 10 minutes.
// Mistakes count much less, so a customer who mistypes their phone a few times is never blocked.
const TEN_MINUTES = 10 * 60 * 1000;
const saves = new Map();      // ip -> [times of saved bookings]
const attempts = new Map();   // ip -> [times of every try]

// Keeps only the times from the last 10 minutes, and tells how many there are
function countRecent(map, ip) {
  const now = Date.now();
  const times = (map.get(ip) || []).filter((t) => now - t < TEN_MINUTES);
  map.set(ip, times);
  return times.length;
}
function remember(map, ip) {
  map.get(ip).push(Date.now());
}

router.post('/bookings', function (request, response) {
  const ip = request.ip;
  if (countRecent(saves, ip) >= 5 || countRecent(attempts, ip) >= 30) {
    return response.status(429).json({ error: 'Too many requests from this device. Please call or WhatsApp 0793 463 223.' });
  }
  remember(attempts, ip);

  const body = request.body || {};
  const result = createBooking(body.choice, body.details);
  if (result.error) {
    // field = which box the problem is in, so the page can put the message next to it
    return response.status(400).json({ error: result.error, field: result.field || null });
  }
  remember(saves, ip);
  // 201 = "created". The page uses the token to open the private status page.
  response.status(201).json(result);
});

router.get('/status/:token', function (request, response) {
  const booking = getBookingByToken(request.params.token);   // :token in the address arrives as request.params.token
  if (!booking) {
    return response.status(404).json({ error: 'We could not find this booking. Please check the link, or call 0793 463 223.' });
  }
  // Add the payments: what is paid, what is left, what to pay now, and whether the Pay button works
  const id = getBookingIdByToken(request.params.token).id;
  const summary = payments.paymentSummary(id);
  booking.payments = {
    paid: summary.paid,
    leftToPay: summary.leftToPay,
    dueNow: payments.amountDue(id),
    payOnline: Boolean(payments.onlineMethod()),
    list: summary.payments.filter((p) => p.status === 'success').map((p) => ({
      id: p.id, amount: p.amount, method: p.method, receiptCode: p.receipt_code, date: p.confirmed_at || p.created_at
    }))
  };
  response.json(booking);
});

router.get('/status/:token/pdf', function (request, response) {
  const booking = getBookingIdByToken(request.params.token);
  if (!booking) { return response.status(404).json({ error: 'We could not find this booking.' }); }
  sendPdf(request, response, booking.id, documentTypeFor(booking.status), request.params.token);
});

// Shared with routes/admin.js: make the PDF and send it to the browser as a download
function sendPdf(request, response, bookingId, type, token) {
  const data = getDocumentData(bookingId, type);
  if (!data) { return response.status(404).json({ error: 'Booking not found.' }); }
  const fileName = data.number + '-' + data.type + '.pdf';                          // MDD-2026-0001-quote.pdf
  response.setHeader('Content-Type', 'application/pdf');
  // "inline" = open it in the browser's PDF viewer (it can be saved or printed from there)
  response.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
  const statusLink = request.protocol + '://' + request.get('host') + '/status/' + (token || data.statusToken);
  writeDocumentPdf(data, response, statusLink);
}

module.exports = router;
module.exports.sendPdf = sendPdf;
