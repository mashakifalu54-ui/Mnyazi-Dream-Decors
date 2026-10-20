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

// One more question: what would each example package cost?
// SUM() adds up qty x price for every item in the package; GROUP BY = one answer per package.
const packages = db.prepare(`
  SELECT packages.name, SUM(package_items.qty * items.unit_price) AS total
  FROM packages
  JOIN package_items ON package_items.package_id = packages.id
  JOIN items ON items.id = package_items.item_id
  GROUP BY packages.id
  ORDER BY packages.sort_order
`).all();

console.log('\nEXAMPLE PACKAGES (hidden, contents still to confirm)');
for (const p of packages) {
  console.log('  ' + p.name.padEnd(10) + ('KES ' + p.total.toLocaleString('en-KE')).padStart(14));
}

console.log('\n' + items.length + ' items on the price list.');
db.close();
