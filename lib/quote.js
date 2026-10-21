// quote.js: turns what the customer picked into a priced quote, on the SERVER.
//
// One job: buildQuote(choice) -> { lines, subtotal, total, deposit, ... }
//
// The browser only sends WHAT and HOW MANY:
//   { items: [ { id: 1, qty: 3 } ], packages: [ { id: 2 } ], custom: [ { name: 'Gold charger plates', qty: 200 } ] }
// Every price comes from the database here. A price sent by the browser is ignored,
// because anyone can change what their browser sends (CLAUDE.md: validate amounts server-side).
//
// Used now by POST /api/quote, and in step 4 when a booking is saved.

const catalogue = require('./catalogue');
const { getSetting } = require('./settings');
const { calculateQuote } = require('../public/js/quote-math');

const MAX_QTY = 9999;
const MAX_LINES = 100;

// Turns anything into a whole number between 1 and MAX_QTY, or null if it isn't one
function cleanQty(value) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) { return null; }
  return qty;
}

// Returns { quote } when everything is fine, or { error: 'plain words' } when not.
function buildQuote(choice) {
  choice = choice || {};
  const items = Array.isArray(choice.items) ? choice.items : [];
  const packages = Array.isArray(choice.packages) ? choice.packages : [];
  const custom = Array.isArray(choice.custom) ? choice.custom : [];

  if (items.length + packages.length + custom.length === 0) {
    return { error: 'Your quote is empty. Add an item or a package first.' };
  }
  if (items.length + packages.length + custom.length > MAX_LINES) {
    return { error: 'Too many lines in one quote.' };
  }

  const lines = [];

  // 1. Price-list items: look each one up in the database
  for (const pick of items) {
    const item = catalogue.getItemById(pick.id);
    const qty = cleanQty(pick.qty);
    if (!item) { return { error: 'One of the items is no longer on the price list. Please refresh the page.' }; }
    if (!qty) { return { error: 'Please use a whole number from 1 to ' + MAX_QTY + ' for ' + item.name + '.' }; }
    lines.push({ kind: 'item', id: item.id, name: item.name, qty: qty, unit_price: item.unit_price });
  }

  // 2. Packages: one of each, at the package price
  for (const pick of packages) {
    const pack = catalogue.getPackageById(pick.id);
    if (!pack) { return { error: 'One of the packages is no longer available. Please refresh the page.' }; }
    lines.push({ kind: 'package', id: pack.id, name: pack.category + ': ' + pack.name, qty: 1, unit_price: pack.price });
  }

  // 3. Custom requests: no price yet ("price pending"); the office prices them later
  for (const pick of custom) {
    const name = String(pick.name || '').trim().slice(0, 120);   // trim = remove spaces at the ends; slice = max 120 letters
    const qty = cleanQty(pick.qty);
    if (!name) { return { error: 'A custom request needs a name.' }; }
    if (!qty) { return { error: 'Please use a whole number from 1 to ' + MAX_QTY + ' for ' + name + '.' }; }
    lines.push({ kind: 'custom', name: name, qty: qty, unit_price: null });
  }

  const depositPercent = Number(getSetting('deposit_percent') || 50);
  return { quote: calculateQuote(lines, { depositPercent: depositPercent }) };
}

module.exports = { buildQuote };
