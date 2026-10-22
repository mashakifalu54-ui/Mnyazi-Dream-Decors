// login-audit.js: writes down every admin login try, and counts recent wrong ones.
//
// One job (CLAUDE.md "Admin security"): the login audit table.
//   recordLogin(ip, success, userAgent)   -> saves one try
//   recentFailures(ip, minutes)           -> how many wrong tries from this address lately
//   recentLogins(limit)                   -> the latest tries, for the office to check

const { openDatabase } = require('../db/connection');
const db = openDatabase();

function recordLogin(ip, success, userAgent) {
  db.prepare('INSERT INTO login_audit (ip, success, user_agent) VALUES (?, ?, ?)')
    .run(String(ip), success ? 1 : 0, String(userAgent || '').slice(0, 200));
}

// Counting from the table (not from memory) means a server restart doesn't reset the count.
// datetime('now', '-15 minutes') = the time 15 minutes ago. Postgres: now() - interval '15 minutes'
function recentFailures(ip, minutes) {
  return db.prepare(`
    SELECT COUNT(*) AS n FROM login_audit
    WHERE ip = ? AND success = 0 AND created_at > datetime('now', ?)
  `).get(String(ip), '-' + Number(minutes) + ' minutes').n;
}

function recentLogins(limit) {
  return db.prepare('SELECT ip, success, user_agent, created_at FROM login_audit ORDER BY id DESC LIMIT ?').all(Number(limit) || 20);
}

module.exports = { recordLogin, recentFailures, recentLogins };
