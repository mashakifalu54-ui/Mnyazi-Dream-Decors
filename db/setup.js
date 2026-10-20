// setup.js: builds the database from schema.sql (the tables) and seed.sql (the starting data).
//
// Run it with:   npm run db:setup
// Start again:   npm run db:reset    (DELETES the database and builds a fresh one)

const fs = require('node:fs');
const path = require('node:path');
const { openDatabase, DB_FILE } = require('./connection');

// process.argv is the list of words typed after "node"; we look for --reset
const reset = process.argv.includes('--reset');

if (fs.existsSync(DB_FILE)) {
  if (!reset) {
    // Safety: never wipe real bookings by accident
    console.log('The database already exists: ' + DB_FILE);
    console.log('Nothing changed. To delete it and start again, run: npm run db:reset');
    process.exit(0);
  }
  fs.rmSync(DB_FILE);
  console.log('Old database deleted.');
}

// Read the two .sql files as plain text
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

const db = openDatabase();

// A TRANSACTION means "all of this, or none of it".
// If any line fails, ROLLBACK undoes everything, so we never end up with half a database.
try {
  db.exec('BEGIN;');
  db.exec(schema);
  db.exec(seed);
  db.exec('COMMIT;');
} catch (error) {
  db.exec('ROLLBACK;');
  db.close();
  fs.rmSync(DB_FILE, { force: true });   // remove the empty file so the next try starts clean
  console.error('Setup failed, nothing was saved:');
  console.error(error.message);
  process.exit(1);
}

// Count what we just added, as a quick check
const count = (table) => db.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n;
console.log('Database created: ' + DB_FILE);
console.log('  categories: ' + count('categories'));
console.log('  items:      ' + count('items'));
console.log('  packages:   ' + count('packages') + ' (hidden examples)');
console.log('Next: npm run db:check   (prints the price list from the database)');

db.close();
