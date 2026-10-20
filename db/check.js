// check.js: reads the price list back OUT of the database and prints it.
// If this looks right, step 1 works.
//
// Run it with:   npm run db:check

const { openDatabase } = require('./connection');
const db = openDatabase();

// A SELECT asks the database a question. This one says:
//   give me each visible item's name and price, plus the name of its category,
//   joining items to categories where items.category_id = categories.id,
//   sorted by category, then by the item's own order.
const items = db.prepare(`
  SELECT categories.name AS category,
         items.id,
         items.name,
         items.unit_price,
         items.office_note
  FROM items
  JOIN categories ON categories.id = items.category_id
  WHERE items.is_visible = 1
  ORDER BY categories.sort_order, items.sort_order
`).all();   // .all() = give me every row as a list

// Print the items grouped under their category
let lastCategory = '';
for (const item of items) {
  if (item.category !== lastCategory) {
    console.log('\n' + item.category.toUpperCase());
    lastCategory = item.category;
  }
  // padStart / padEnd add spaces so the columns line up
  const price = 'KES ' + item.unit_price.toLocaleString('en-KE');
  const flag = item.office_note ? '   <- check with office' : '';
  console.log('  ' + String(item.id).padStart(2) + '  ' + item.name.padEnd(46) + price.padStart(11) + flag);
}

// One more question: what would each example package cost for a given number of guests?
// For each item in the package:
//   if per_guests is empty  -> use qty
//   otherwise               -> guests / per_guests, rounded UP
//     (whole-number trick for "rounded up": (guests + per_guests - 1) / per_guests)
// SUM() adds up amount x price; GROUP BY = one answer per package.
// The ? is filled in safely by .all(guests); never glue values into SQL text yourself.
// CAST(? AS INTEGER): Node sends numbers as decimals; this makes it a whole number so the division rounds properly.
const packageTotal = db.prepare(`
  SELECT packages.name,
         SUM(
           CASE WHEN package_items.per_guests IS NULL THEN package_items.qty
                ELSE (CAST(? AS INTEGER) + package_items.per_guests - 1) / package_items.per_guests
           END * items.unit_price
         ) AS total
  FROM packages
  JOIN package_items ON package_items.package_id = packages.id
  JOIN items ON items.id = package_items.item_id
  GROUP BY packages.id
  ORDER BY packages.sort_order
`);

const kes = (n) => ('KES ' + n.toLocaleString('en-KE')).padStart(15);
const for100 = packageTotal.all(100);
const for200 = packageTotal.all(200);

console.log('\nEXAMPLE PACKAGES (hidden, contents still to confirm)');
console.log('  ' + ''.padEnd(10) + '100 guests'.padStart(15) + '200 guests'.padStart(15));
for100.forEach(function (p, i) {
  console.log('  ' + p.name.padEnd(10) + kes(p.total) + kes(for200[i].total));
});

// The budget chips, straight from the database
const ranges = db.prepare('SELECT label FROM budget_ranges ORDER BY sort_order').all();
console.log('\nBUDGET CHIPS: ' + ranges.map((r) => r.label).join(' | '));

console.log('\n' + items.length + ' items on the price list.');
db.close();
