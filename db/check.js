// check.js: reads the price list and packages back OUT of the database and prints them.
// If this looks right, the database works.
//
// Run it with:   npm run db:check
//
// It uses the SAME functions as the website (lib/catalogue.js),
// so if this prints the right prices, the website gets the right prices too.

const catalogue = require('../lib/catalogue');
const { openDatabase } = require('./connection');

const kes = (n) => 'KES ' + n.toLocaleString('en-KE');   // 3000 -> 'KES 3,000'

// ---------- Price list ----------
let count = 0;
for (const group of catalogue.getPriceList()) {
  console.log('\n' + group.name.toUpperCase());
  for (const item of group.items) {
    // padStart / padEnd add spaces so the columns line up
    console.log('  ' + String(item.id).padStart(2) + '  ' + item.name.padEnd(46) + kes(item.unit_price).padStart(11));
    count++;
  }
}

// ---------- Packages ----------
let lastCategory = '';
for (const pack of catalogue.getPackages()) {
  if (pack.category !== lastCategory) {
    console.log('\nPACKAGES: ' + pack.category.toUpperCase() + ' (tents and chairs not included)');
    lastCategory = pack.category;
  }
  const seats = pack.guests_seated ? pack.guests_seated + ' seats' : '';
  console.log('  ' + pack.name.padEnd(28) + kes(pack.price).padStart(12) + '   ' + seats.padEnd(10) + pack.includes.length + ' lines included');
}

// ---------- Lists for the forms ----------
console.log('\nBUDGET CHIPS: ' + catalogue.getBudgetRanges().map((r) => r.label).join(' | '));
console.log('EVENT TYPES:  ' + catalogue.getEventTypes().join(', '));

// ---------- Office reminders (never shown to customers) ----------
const db = openDatabase();
const notes = db.prepare('SELECT id, name, office_note FROM items WHERE office_note IS NOT NULL ORDER BY id').all();
console.log('\nTO CHECK WITH THE OFFICE (' + notes.length + ')');
for (const n of notes) {
  console.log('  ' + String(n.id).padStart(2) + '  ' + n.name + ': ' + n.office_note);
}

console.log('\n' + count + ' items on the price list.');
