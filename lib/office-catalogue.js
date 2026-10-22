// office-catalogue.js: the office changes the price list, the packages and the settings.
//
// One job: editing what we sell (CLAUDE.md: prices must be easy to change from the admin page,
// because the new rate card is coming). All the SQL for it is here.
//   getCatalogueForOffice()     -> everything, including hidden items and the office notes
//   saveItem(id, data)          -> change an item (id) or add a new one (id = null)
//   savePackage(id, data)       -> change a package or add one, with its "includes" lines
//   saveSettings(data)          -> deposit % and how many days a quote is valid
//
// Nothing is ever deleted: old bookings point to items and packages, so we HIDE them instead.
// Changing a price never changes an old quote: bookings keep the price they were made with.
// Every function returns { ok: true, id } or { error: 'plain words' }.

const { openDatabase } = require('../db/connection');
const db = openDatabase();


// ---------- Checking what the office typed ----------
// These throw an Error with plain words; the save functions turn it into { error }.
function text(value, label, max, required) {
  const clean = String(value == null ? '' : value).trim().slice(0, max);
  if (required && !clean) { throw new Error(label + ' is needed.'); }
  return clean || null;
}
function wholeNumber(value, label, min, max, allowEmpty) {
  if (allowEmpty && (value === '' || value === null || value === undefined)) { return null; }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) { throw new Error(label + ': use a whole number from ' + min.toLocaleString('en-KE') + ' to ' + max.toLocaleString('en-KE') + '.'); }
  return n;
}
function yesNo(value) { return value === true || value === 1 || value === '1' || value === 'on' ? 1 : 0; }

// "White Wedding" + "Basic Celebration" -> "white-wedding-basic-celebration" (used in links later)
function makeSlug(textValue) {
  return String(textValue).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}


// ---------- Read everything ----------
function getCatalogueForOffice() {
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY sort_order').all();
  const items = db.prepare(`
    SELECT id, category_id, name, description, unit_price, stock_count, is_visible, office_note
    FROM items ORDER BY sort_order, id
  `).all();
  const packages = db.prepare('SELECT id, category, name, price, guests_seated, is_visible FROM packages ORDER BY sort_order, id').all();
  const includes = db.prepare('SELECT line FROM package_includes WHERE package_id = ? ORDER BY sort_order');
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?');

  return {
    categories: categories,
    items: items,
    packages: packages.map((p) => Object.assign({}, p, { includes: includes.all(p.id).map((row) => row.line) })),
    // The package groups the budget finder knows (event_types.package_category), so a rename doesn't break it
    finderGroups: db.prepare('SELECT DISTINCT package_category AS name FROM event_types WHERE package_category IS NOT NULL').all().map((r) => r.name),
    settings: {
      depositPercent: Number(setting.get('deposit_percent').value),
      quoteValidDays: Number(setting.get('quote_valid_days').value),
      // These two may be missing in a database made before they existed: then they are empty
      mpesaPaybill: (setting.get('mpesa_paybill') || {}).value || '',
      balanceDueDays: (setting.get('balance_due_days') || {}).value || ''
    }
  };
}


// ---------- Items ----------
function saveItem(id, data) {
  data = data || {};
  try {
    const item = {
      name: text(data.name, 'Name', 80, true),
      description: text(data.description, 'Description', 300, false),
      categoryId: wholeNumber(data.categoryId, 'Category', 1, 1000000),
      unitPrice: wholeNumber(data.unitPrice, 'Price', 0, 10000000),
      stockCount: wholeNumber(data.stockCount, 'Stock', 0, 100000, true),   // empty = not known
      isVisible: yesNo(data.isVisible),
      officeNote: text(data.officeNote, 'Office note', 300, false)
    };
    if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(item.categoryId)) { throw new Error('Please choose a category from the list.'); }

    if (id) {
      const result = db.prepare(`
        UPDATE items SET name = ?, description = ?, category_id = ?, unit_price = ?, stock_count = ?, is_visible = ?, office_note = ?
        WHERE id = ?
      `).run(item.name, item.description, item.categoryId, item.unitPrice, item.stockCount, item.isVisible, item.officeNote, id);
      if (result.changes === 0) { throw new Error('Item not found. Please reload the page.'); }
      return { ok: true, id: id };
    }

    // New item: at the end of the list. COALESCE(MAX(...), 0) = the biggest number so far, or 0 if there are none.
    const next = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM items').get().n;
    const row = db.prepare(`
      INSERT INTO items (category_id, name, description, unit_price, stock_count, is_visible, office_note, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).get(item.categoryId, item.name, item.description, item.unitPrice, item.stockCount, item.isVisible, item.officeNote, next);
    return { ok: true, id: row.id };
  } catch (error) {
    return { error: error.message };
  }
}


// ---------- Packages ----------
// data.includes: the "what's included" lines, either a list or one text with a line per row
function savePackage(id, data) {
  data = data || {};
  try {
    const pack = {
      category: text(data.category, 'Package group', 40, true),
      name: text(data.name, 'Name', 60, true),
      price: wholeNumber(data.price, 'Price', 0, 10000000),
      guestsSeated: wholeNumber(data.guestsSeated, 'Guests seated', 1, 5000, true),
      isVisible: yesNo(data.isVisible)
    };
    const raw = Array.isArray(data.includes) ? data.includes : String(data.includes || '').split(/\r?\n/);
    const lines = raw.map((line) => String(line).trim().slice(0, 120)).filter(Boolean).slice(0, 30);
    if (lines.length === 0) { throw new Error('Add at least one "included" line.'); }

    // TRANSACTION: the package and its lines change together, or not at all
    db.exec('BEGIN');
    let packageId = id;
    if (id) {
      const result = db.prepare('UPDATE packages SET category = ?, name = ?, price = ?, guests_seated = ?, is_visible = ? WHERE id = ?')
        .run(pack.category, pack.name, pack.price, pack.guestsSeated, pack.isVisible, id);
      if (result.changes === 0) { throw new Error('Package not found. Please reload the page.'); }
    } else {
      // A unique slug: add -2, -3 ... if the name is already used
      let slug = makeSlug(pack.category + ' ' + pack.name);
      for (let n = 2; db.prepare('SELECT id FROM packages WHERE slug = ?').get(slug); n++) {
        slug = makeSlug(pack.category + ' ' + pack.name) + '-' + n;
      }
      const next = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM packages').get().n;
      packageId = db.prepare(`
        INSERT INTO packages (slug, category, name, price, guests_seated, is_visible, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
      `).get(slug, pack.category, pack.name, pack.price, pack.guestsSeated, pack.isVisible, next).id;
    }

    // Simplest safe way to change the lines: remove the old ones, add the new ones in order
    db.prepare('DELETE FROM package_includes WHERE package_id = ?').run(packageId);
    const addLine = db.prepare('INSERT INTO package_includes (package_id, line, sort_order) VALUES (?, ?, ?)');
    lines.forEach((line, i) => addLine.run(packageId, line, i + 1));

    db.exec('COMMIT');
    return { ok: true, id: packageId };
  } catch (error) {
    if (db.isTransaction) { db.exec('ROLLBACK'); }
    return { error: error.message };
  }
}


// ---------- Settings ----------
function saveSettings(data) {
  data = data || {};
  try {
    const deposit = wholeNumber(data.depositPercent, 'Deposit %', 0, 100);
    const validDays = wholeNumber(data.quoteValidDays, 'Quote valid for (days)', 1, 90);
    const paybill = String(data.mpesaPaybill || '').replace(/\s/g, '');
    if (paybill && !/^\d{5,7}$/.test(paybill)) { throw new Error('Paybill / Till: 5 to 7 digits, or leave it empty.'); }
    const balanceDays = wholeNumber(data.balanceDueDays, 'Balance due (days before)', 0, 60, true);

    // "Upsert": add the setting if it's missing, otherwise change it.
    // ON CONFLICT ... DO UPDATE works the same in SQLite and Postgres.
    const set = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value');
    set.run('deposit_percent', String(deposit));      // new bookings use it; old bookings keep theirs
    set.run('quote_valid_days', String(validDays));
    set.run('mpesa_paybill', paybill);
    set.run('balance_due_days', balanceDays == null ? '' : String(balanceDays));
    return { ok: true };
  } catch (error) {
    return { error: error.message };
  }
}


module.exports = { getCatalogueForOffice, saveItem, savePackage, saveSettings };
