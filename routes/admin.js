// routes/admin.js: the web addresses for the office admin page. All start with /api/admin.
//
// EVERY address here needs a login: requireAdmin runs first and answers 404 without one.
// (Logging in and out is in routes/auth.js, under /api/auth.)
//   GET  /api/admin/dashboard                        -> the numbers at the top
//   GET  /api/admin/bookings?filter=attention        -> the table of booking requests
//   GET  /api/admin/bookings/:id                     -> one booking
//   POST /api/admin/bookings/:id                     -> save prices, transport, discount, notes
//   POST /api/admin/bookings/:id/status  { action, reason }  -> confirm / decline / cancel / complete
//   GET  /api/admin/bookings/:id/pdf?type=quote|invoice  -> the document as a PDF
//   POST /api/admin/bookings/:id/payments { amount, method, receiptCode, note } -> record a payment by hand
//   GET  /api/admin/payments/:id/pdf                 -> the receipt for one payment
//   GET  /api/admin/catalogue                        -> items, packages, settings (including hidden ones)
//   POST /api/admin/items          | /items/:id      -> add an item | change one
//   POST /api/admin/packages       | /packages/:id   -> add a package | change one
//   POST /api/admin/settings                         -> deposit % and quote valid days
//
// No SQL here (CLAUDE.md): the work is done in lib/office.js and lib/office-catalogue.js.

const express = require('express');
const auth = require('../lib/auth');
const office = require('../lib/office');
const catalogue = require('../lib/office-catalogue');
const { sendPdf } = require('./bookings');
const { documentTypeFor } = require('../lib/documents');
const payments = require('../lib/payments');
const { sendReceipt } = require('./payments');

const router = express.Router();


// ---------- The lock: runs before every /api/admin/... route ----------
router.use('/admin', auth.requireAdmin);

router.get('/admin/dashboard', function (request, response) {
  response.json(office.getDashboard());
});

router.get('/admin/bookings', function (request, response) {
  response.json(office.listBookings(String(request.query.filter || 'attention')));   // ?filter=... arrives in request.query
});

router.get('/admin/bookings/:id', function (request, response) {
  const booking = office.getBookingForOffice(Number(request.params.id));
  if (!booking) { return response.status(404).json({ error: 'Booking not found.' }); }
  response.json(booking);
});

router.post('/admin/bookings/:id', function (request, response) {
  const result = office.saveOfficeChanges(Number(request.params.id), request.body);
  if (result.error) { return response.status(400).json(result); }
  response.json(office.getBookingForOffice(Number(request.params.id)));   // send back the fresh booking
});

router.post('/admin/bookings/:id/status', function (request, response) {
  const body = request.body || {};
  const result = office.changeStatus(Number(request.params.id), body.action, body.reason);
  if (result.error) { return response.status(400).json(result); }
  response.json(office.getBookingForOffice(Number(request.params.id)));
});

router.get('/admin/bookings/:id/pdf', function (request, response) {
  const booking = office.getBookingForOffice(Number(request.params.id));
  if (!booking) { return response.status(404).json({ error: 'Booking not found.' }); }
  // The office may ask for either; without ?type= it gets the one that fits the status
  const type = ['quote', 'invoice'].includes(request.query.type) ? request.query.type : documentTypeFor(booking.status);
  sendPdf(request, response, booking.id, type);
});

// ---------- Payments recorded by the office (lib/payments/manual.js) ----------
router.post('/admin/bookings/:id/payments', function (request, response) {
  const body = request.body || {};
  const result = payments.startPayment(Number(request.params.id), 'manual', null, body.amount,
    { method: body.method, receiptCode: body.receiptCode, note: body.note });
  if (result.error) { return response.status(400).json(result); }
  response.json(office.getBookingForOffice(Number(request.params.id)));
});

router.get('/admin/payments/:id/pdf', function (request, response) {
  sendReceipt(request, response, Number(request.params.id));
});

// ---------- Items, prices, packages, settings ----------
// Sends back { error } with 400, or the whole fresh catalogue so the page shows what was saved
function answer(response, result) {
  if (result.error) { return response.status(400).json(result); }
  response.json(Object.assign({ savedId: result.id }, catalogue.getCatalogueForOffice()));
}

router.get('/admin/catalogue', function (request, response) {
  response.json(catalogue.getCatalogueForOffice());
});
router.post('/admin/items', function (request, response) {
  answer(response, catalogue.saveItem(null, request.body));
});
router.post('/admin/items/:id', function (request, response) {
  answer(response, catalogue.saveItem(Number(request.params.id), request.body));
});
router.post('/admin/packages', function (request, response) {
  answer(response, catalogue.savePackage(null, request.body));
});
router.post('/admin/packages/:id', function (request, response) {
  answer(response, catalogue.savePackage(Number(request.params.id), request.body));
});
router.post('/admin/settings', function (request, response) {
  answer(response, catalogue.saveSettings(request.body));
});

module.exports = router;
