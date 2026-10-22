// routes/bookings.js: the web addresses for booking requests.
//
//   POST /api/bookings          the customer sends their picks + event details; we save the booking
//   GET  /api/status/:token     the private status page asks for its booking
//
// No SQL here (CLAUDE.md): the work is done in lib/bookings.js.

const express = require('express');
const { createBooking, getBookingByToken } = require('../lib/bookings');

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
  response.json(booking);
});

module.exports = router;
