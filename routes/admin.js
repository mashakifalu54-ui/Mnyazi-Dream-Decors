// routes/admin.js: the web addresses for the office admin page. All start with /api/admin.
//
// EVERY address here needs a login: requireAdmin runs first and answers 404 without one.
// (Logging in and out is in routes/auth.js, under /api/auth.)
//   GET  /api/admin/dashboard                        -> the numbers at the top
//   GET  /api/admin/bookings?filter=attention        -> the table of booking requests
//   GET  /api/admin/bookings/:id                     -> one booking
//   POST /api/admin/bookings/:id                     -> save prices, transport, discount, notes
//   POST /api/admin/bookings/:id/status  { action, reason }  -> confirm / decline / cancel / complete
//
// No SQL here (CLAUDE.md): the work is done in lib/office.js.

const express = require('express');
const auth = require('../lib/auth');
const office = require('../lib/office');

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

module.exports = router;
