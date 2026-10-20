// connection.js: opens the database file. Every other file that needs the
// database asks this file for it, so the settings below are written only once.

// node:sqlite is SQLite built into Node.js (version 22.5 or newer), so there is nothing to install.
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// The database is ONE file: data/mnyazi.db (the data folder is next to the db folder).
// __dirname means "the folder this file is in".
const DB_FILE = path.join(__dirname, '..', 'data', 'mnyazi.db');

function openDatabase() {
  // Make the data folder if it isn't there yet
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

  const db = new DatabaseSync(DB_FILE);   // opens the file (creates it if it doesn't exist)

  // SQLite only checks the REFERENCES rules (foreign keys) when we switch them on.
  // Without this, a booking line could point to an item that doesn't exist.
  db.exec('PRAGMA foreign_keys = ON;');

  return db;
}

// module.exports = what other files get when they write require('./connection')
module.exports = { openDatabase, DB_FILE };
