// routes/auth.js: logging in and out of the office admin page.
//
//   POST /api/auth/login    { password }  -> logs in (sets the session cookie)
//   POST /api/auth/logout                 -> logs out
//   GET  /api/auth/me                     -> am I logged in? (the admin pages ask first)
//
// These are NOT under /api/admin on purpose: everything under /api/admin is locked (CLAUDE.md).
// Every try is written to the login_audit table (lib/login-audit.js).

const express = require('express');
const auth = require('../lib/auth');
const audit = require('../lib/login-audit');

const router = express.Router();

const MAX_WRONG = 5;      // CLAUDE.md: 5 tries,
const WAIT_MINUTES = 15;  // then a 15-minute wait per address

router.post('/auth/login', function (request, response) {
  const ip = request.ip;
  if (audit.recentFailures(ip, WAIT_MINUTES) >= MAX_WRONG) {
    return response.status(429).json({ error: 'Too many wrong passwords. Wait ' + WAIT_MINUTES + ' minutes and try again.' });
  }

  const saved = process.env.ADMIN_PASSWORD_HASH;   // from the .env file (see scripts/set-admin-password.js)
  if (!saved) {
    return response.status(503).json({ error: 'No admin password yet. In the terminal run: npm run admin:password' });
  }

  const password = String((request.body || {}).password || '');
  const ok = auth.checkPassword(password, saved);
  audit.recordLogin(ip, ok, request.get('user-agent'));   // written down, right or wrong
  if (!ok) {
    return response.status(401).json({ error: 'That password is not right.' });
  }
  auth.startSession(request, response);
  response.json({ ok: true });
});

router.post('/auth/logout', function (request, response) {
  auth.endSession(request, response);
  response.json({ ok: true });
});

router.get('/auth/me', function (request, response) {
  response.json({ loggedIn: auth.isLoggedIn(request), passwordSet: Boolean(process.env.ADMIN_PASSWORD_HASH) });
});

module.exports = router;
