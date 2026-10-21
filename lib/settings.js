// settings.js: reads the small office settings (deposit %, phone number ...) from the database.
//
// One job: getSetting('deposit_percent') -> '50'.
// Values are stored as text; the code that uses them converts them (Number(...)).

const { openDatabase } = require('../db/connection');
const db = openDatabase();

function getSetting(key) {
  // Postgres note: the ? placeholder becomes $1 there.
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;   // null = no such setting
}

module.exports = { getSetting };
