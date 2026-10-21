// catalogue.js: reads the price list and the packages OUT of the database.
//
// One job: answer "what do we sell and for how much?".
// The web routes (routes/items.js), db/check.js and, later, the quote,
// the admin page and the local search pages all reuse these functions,
// so the SQL is written only once.

const { openDatabase } = require('../db/connection');

// Open the database once when this file is first loaded, then reuse it.
const db = openDatabase();


// ---------- The price list, grouped by category ----------
// Returns: [ { slug, name, items: [ { id, name, description, unit_price, photo }, ... ] }, ... ]
function getPriceList() {
  // One SELECT that joins every visible item to its category.
  // office_note and stock_count are NOT selected: customers must never see them.
  const rows = db.prepare(`
    SELECT categories.slug  AS category_slug,
           categories.name  AS category_name,
           items.id, items.name, items.description, items.unit_price, items.photo
    FROM items
    JOIN categories ON categories.id = items.category_id
    WHERE items.is_visible = 1
    ORDER BY categories.sort_order, items.sort_order
  `).all();

  // Turn the flat list of rows into groups: one group per category.
  const groups = [];
  for (const row of rows) {
    let group = groups[groups.length - 1];          // the group we are filling right now
    if (!group || group.slug !== row.category_slug) {
      group = { slug: row.category_slug, name: row.category_name, items: [] };
      groups.push(group);                            // a new category starts here
    }
    group.items.push({
      id: row.id,
      name: row.name,
      description: row.description,
      unit_price: row.unit_price,
      photo: row.photo
    });
  }
  return groups;
}


// ---------- The packages, each with its "includes" lines ----------
// Returns: [ { id, slug, category, name, price, guests_seated, includes: ['Photo booth', ...] }, ... ]
function getPackages() {
  const packages = db.prepare(`
    SELECT id, slug, category, name, price, guests_seated
    FROM packages
    WHERE is_visible = 1
    ORDER BY sort_order
  `).all();

  // The ? is replaced safely by the package id we pass to .all(id)
  const includesQuery = db.prepare(`
    SELECT line FROM package_includes
    WHERE package_id = ?
    ORDER BY sort_order
  `);

  // map() makes a new list: each package plus its lines of text
  return packages.map(function (pack) {
    const lines = includesQuery.all(pack.id).map((row) => row.line);
    return { ...pack, includes: lines };   // "...pack" copies every field of pack
  });
}


// ---------- Small lists used by forms ----------
function getEventTypes() {
  return db.prepare('SELECT name FROM event_types ORDER BY sort_order').all().map((row) => row.name);
}

function getBudgetRanges() {
  return db.prepare('SELECT id, label, min_amount, max_amount FROM budget_ranges ORDER BY sort_order').all();
}


// ---------- Look up ONE item or package by its id (used by the quote) ----------
// Only visible ones: a hidden item can't be added to a quote.
// Each returns undefined when there is no such visible item/package.
function getItemById(id) {
  return db.prepare('SELECT id, name, unit_price FROM items WHERE id = ? AND is_visible = 1').get(id);
}

function getPackageById(id) {
  return db.prepare('SELECT id, category, name, price FROM packages WHERE id = ? AND is_visible = 1').get(id);
}


module.exports = { getPriceList, getPackages, getEventTypes, getBudgetRanges, getItemById, getPackageById };
