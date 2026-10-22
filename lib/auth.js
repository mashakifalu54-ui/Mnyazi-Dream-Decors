// auth.js: the lock on the office admin page (CLAUDE.md: "admin page behind a password").
//
// One job: who is logged in?
//   hashPassword('secret')            -> 'scrypt$<salt>$<hash>'   (what we keep in .env, never the password itself)
//   checkPassword('secret', saved)    -> true / false
//   startSession(response)            -> logs the office in: sets a cookie in their browser
//   isLoggedIn(request)               -> true / false
//   endSession(request, response)     -> logs out
//   requireAdmin                      -> put in front of a route: only logged-in people get through
//
// How it works, in plain words:
//   1. The password is never stored. We store a "hash": a scrambled fingerprint of it.
//      scrypt is a slow scrambler on purpose, so guessing millions of passwords takes too long.
//   2. After a correct password, the server makes a long random "session code", remembers it,
//      and gives it to the browser in a cookie. The browser sends the cookie back on every request.
//   3. A request with a remembered, unexpired code = logged in.

const crypto = require('node:crypto');

const COOKIE_NAME = 'mdd_admin';
const SESSION_HOURS = 12;
const sessions = new Map();   // session code -> time it expires (restarting the server logs everyone out)


// ---------- Passwords ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');                 // random extra, different for every password
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return 'scrypt$' + salt + '$' + hash;
}

function checkPassword(password, saved) {
  const parts = String(saved || '').split('$');                       // ['scrypt', salt, hash]
  if (parts.length !== 3 || parts[0] !== 'scrypt') { return false; }
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(String(password), parts[1], expected.length);
  // timingSafeEqual compares in a way that takes the same time whether the first letter or the last is wrong,
  // so nobody can learn the password by timing the answers
  return crypto.timingSafeEqual(expected, actual);
}


// ---------- Cookies ----------
// The browser sends cookies as one line: "a=1; mdd_admin=9f3a...; b=2". This finds ours.
function readCookie(request, name) {
  const line = request.headers.cookie || '';
  for (const part of line.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) { return decodeURIComponent(rest.join('=')); }
  }
  return null;
}


// ---------- Sessions ----------
function startSession(request, response) {
  const code = crypto.randomBytes(32).toString('hex');
  sessions.set(code, Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  response.cookie(COOKIE_NAME, code, {
    httpOnly: true,                    // JavaScript in the page can't read it (protects against stolen cookies)
    sameSite: 'lax',                   // not sent with forms or pictures from other websites (CLAUDE.md: 'lax')
    secure: request.secure || process.env.NODE_ENV === 'production',   // live site: only over HTTPS
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
    path: '/'
  });
}

function isLoggedIn(request) {
  const code = readCookie(request, COOKIE_NAME);
  const expires = code ? sessions.get(code) : null;
  if (!expires) { return false; }
  if (expires < Date.now()) { sessions.delete(code); return false; }   // too old: forget it
  return true;
}

function endSession(request, response) {
  const code = readCookie(request, COOKIE_NAME);
  if (code) { sessions.delete(code); }
  response.clearCookie(COOKIE_NAME, { path: '/' });
}

// "Middleware": a function Express runs BEFORE the route. next() = "carry on to the route".
// CLAUDE.md "Admin security": the server is the lock, not the page. Without a valid session
// every /api/admin/... address answers 404 "not found", so a stranger can't even tell it exists.
function requireAdmin(request, response, next) {
  if (!isLoggedIn(request)) {
    return response.status(404).json({ error: 'Not found' });
  }
  next();
}


module.exports = { hashPassword, checkPassword, startSession, isLoggedIn, endSession, requireAdmin };
