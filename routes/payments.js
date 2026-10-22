// routes/payments.js: the customer pays from their private status page (CLAUDE.md "Browser confirmation").
//
//   POST /api/payments               { token, phone }  -> starts a payment; answers { paymentId, status: 'pending' }
//   GET  /api/payments/:id?token=...                   -> the page asks every 2-3 seconds: pending / success / failed
//   GET  /api/status/:token/receipts/:paymentId/pdf    -> the customer's receipt
//
// The browser only SHOWS the result. The amount is worked out on the server (amountDue),
// and the provider's callback is what makes a payment count.
// No SQL here (CLAUDE.md): the work is done in lib/payments.

const express = require('express');
const payments = require('../lib/payments');
const { getBookingIdByToken } = require('../lib/bookings');
const { normalizeKenyanPhone } = require('../public/js/kenya-phone');
const { getReceiptData } = require('../lib/documents');
const { writeReceiptPdf } = require('../lib/pdf');

const router = express.Router();

// CLAUDE.md: rate-limit payment attempts per phone. At most 3 tries per phone every 10 minutes
// (each try sends a PIN prompt to that phone, so this also stops someone annoying a stranger).
const tries = new Map();
function tooManyTries(phone) {
  const now = Date.now();
  const recent = (tries.get(phone) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  tries.set(phone, recent);
  return recent.length > 3;
}

router.post('/payments', function (request, response) {
  const body = request.body || {};
  const booking = getBookingIdByToken(body.token);
  if (!booking) { return response.status(404).json({ error: 'We could not find this booking.' }); }

  const method = payments.onlineMethod();
  if (!method) { return response.status(503).json({ error: 'Paying online is not switched on yet. Please use the M-Pesa details on your invoice.' }); }

  const phone = normalizeKenyanPhone(body.phone);
  if (!phone) { return response.status(400).json({ error: 'Use the Safaricom number that will pay, like 0712 345 678.' }); }
  if (tooManyTries(phone)) { return response.status(429).json({ error: 'Too many tries for this number. Wait 10 minutes, or call 0793 463 223.' }); }

  const amount = payments.amountDue(booking.id);    // from the booking, never from the browser
  if (amount < 1) { return response.status(400).json({ error: 'Nothing to pay right now.' }); }

  const result = payments.startPayment(booking.id, method, phone, amount);
  if (result.error) { return response.status(400).json(result); }
  response.status(201).json({ paymentId: result.paymentId, status: result.status, amount: amount });
});

// Only answers when the token matches the payment's booking, so nobody can peek at other people's payments
router.get('/payments/:id', function (request, response) {
  const booking = getBookingIdByToken(request.query.token);
  const payment = payments.getPayment(Number(request.params.id));
  if (!booking || !payment || payment.booking_id !== booking.id) {
    return response.status(404).json({ error: 'Payment not found.' });
  }
  response.json({ id: payment.id, status: payment.status, amount: payment.amount, receiptCode: payment.receipt_code });
});

router.get('/status/:token/receipts/:paymentId/pdf', function (request, response) {
  const booking = getBookingIdByToken(request.params.token);
  const payment = payments.getPayment(Number(request.params.paymentId));
  if (!booking || !payment || payment.booking_id !== booking.id) {
    return response.status(404).json({ error: 'Receipt not found.' });
  }
  sendReceipt(request, response, payment.id, request.params.token);
});

// Shared with routes/admin.js
function sendReceipt(request, response, paymentId, token) {
  const data = getReceiptData(paymentId);
  if (!data) { return response.status(404).json({ error: 'There is a receipt only for a successful payment.' }); }
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Content-Disposition', 'inline; filename="' + data.number + '-receipt.pdf"');
  const statusLink = request.protocol + '://' + request.get('host') + '/status/' + (token || data.statusToken);
  writeReceiptPdf(data, response, statusLink);
}

module.exports = router;
module.exports.sendReceipt = sendReceipt;
