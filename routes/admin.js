// routes/admin.js: the web addresses for the office admin page. All start with /api/admin.
//
//   POST /api/admin/login              { password }  -> logs in (sets the cookie)
//   POST /api/admin/logout                           -> logs out
//   GET  /api/admin/me                               -> am I logged in? (the page asks first)
//   ---- everything below needs a login (requireAdmin) ----
//   GET  /api/admin/dashboard                        -> the numbers at the top
//   GET  /api/admin/bookings?filter=attention        -> the table of booking requests
//   GET  /api/admin/bookings/:id                     -> one booking
//   POST /api/admin/bookings/:id                     -> save prices, transport, discount, notes
//   POST /api/admin/bookings/:id/status  { action, reason }  -> confirm / decline / cancel / complete
//
// No SQL here (CLAUDE.md): the work is done in lib/office.js and lib/auth.js.

const express = require('express');
const auth = require('../lib/auth');
const office = require('../lib/office');

const router = express.Router();


// ---------- Log in / out ----------
// At most 10 wrong passwords per device every 15 minutes, so nobody can try thousands
const loginTries = new Map();   // ip -> [times of wrong tries]
const FIFTEEN_MINUTES = 15 * 60 * 1000;

router.post('/admin/login', function (request, response) {
  const ip = request.ip;
  const now = Date.now();
  const tries = (loginTries.get(ip) || []).filter((t) => now - t < FIFTEEN_MINUTES);
  loginTries.set(ip, tries);
  if (tries.length >= 10) {
    return response.status(429).json({ error: 'Too many wrong passwords. Wait 15 minutes and try again.' });
  }

  const saved = process.env.ADMIN_PASSWORD_HASH;   // from the .env file (see scripts/set-admin-password.js)
  if (!saved) {
    return response.status(503).json({ error: 'No admin password yet. In the terminal run: npm run admin:password' });
  }
  const password = String((request.body || {}).password || '');
  if (!auth.checkPassword(password, saved)) {
    tries.push(now);
    return response.status(401).json({ error: 'That password is not right.' });
  }
  loginTries.delete(ip);
  auth.startSession(request, response);
  response.json({ ok: true });
});

router.post('/admin/logout', function (request, response) {
  auth.endSession(request, response);
  response.json({ ok: true });
});

router.get('/admin/me', function (request, response) {
  response.json({ loggedIn: auth.isLoggedIn(request), passwordSet: Boolean(process.env.ADMIN_PASSWORD_HASH) });
});


// ---------- Everything below: logged-in office only ----------
// router.use(fn) runs fn before every route added after it, but only for addresses under /admin
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
