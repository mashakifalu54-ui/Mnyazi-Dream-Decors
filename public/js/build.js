/*
  build.js: the Build your event page.
  1. What the customer has picked (the "cart"), kept in the browser so a refresh doesn't lose it
  2. Load prices and packages from the server
  3. Packages: tabs and cards with Add / Remove
  4. Items: category chips and cards with Add, then − 3 +
  5. Custom requests ("price pending")
  6. Totals: uses calculateQuote() from quote-math.js (the same maths as the server)
  7. Review: asks the SERVER to price the quote (/api/quote) and shows the answer
  Uses kes() and escapeHtml() from common.js.
*/

// ---------- 1. The cart ----------
// items:    { itemId: qty }        e.g. { 1: 3, 2: 2 }  = 3 tents, 2 side covers
// packages: [ packageId, ... ]     each package once
// custom:   [ { name, qty }, ... ] requests the office will price
let cart = { items: {}, packages: [], custom: [] };

// Saved in the browser (localStorage) so a refresh or "back" never loses the customer's choices.
// try/catch: some browsers block storage (private mode); then the page still works, it just forgets.
const SAVE_KEY = 'mnyazi-cart';
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved && saved.items && saved.packages && saved.custom) { cart = saved; }
} catch (error) { /* nothing saved, or storage blocked: start empty */ }

function saveCart() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(cart)); } catch (error) { /* storage blocked */ }
}


// ---------- 2. Load from the server ----------
let priceGroups = [];                 // the price list, grouped by category
let allPackages = [];
let itemsById = {};                   // quick lookup: itemsById[1] -> the tent
let packagesById = {};
let depositPercent = 50;
let currentCategory = 'all';
let currentPackageGroup = null;

async function loadPage() {
  try {
    const [groups, packages, options] = await Promise.all([
      fetch('/api/items').then((answer) => answer.json()),
      fetch('/api/packages').then((answer) => answer.json()),
      fetch('/api/options').then((answer) => answer.json())
    ]);
    priceGroups = groups;
    allPackages = packages;
    depositPercent = options.depositPercent;
    groups.forEach((group) => group.items.forEach((item) => { itemsById[item.id] = item; }));
    packages.forEach((pack) => { packagesById[pack.id] = pack; });
    document.querySelectorAll('.deposit-percent').forEach((el) => { el.textContent = depositPercent; });

    // A saved cart may mention an item that was removed from the price list since: drop it quietly
    Object.keys(cart.items).forEach((id) => { if (!itemsById[id]) { delete cart.items[id]; } });
    cart.packages = cart.packages.filter((id) => packagesById[id]);

    showPackageTabs();
    showCategoryChips();
    showItems();
    updateTotals();
  } catch (error) {
    // Usually means the server is not running (page opened by double-click instead of npm start)
    const message = '<p class="loading">Prices could not load. Please call or WhatsApp us on 0793 463 223.</p>';
    document.getElementById('packageGrid').innerHTML = message;
    document.getElementById('itemGrid').innerHTML = message;
    console.error(error);
  }
}


// ---------- 3. Packages ----------
function showPackageTabs() {
  const groups = [];
  allPackages.forEach((pack) => { if (!groups.includes(pack.category)) { groups.push(pack.category); } });
  currentPackageGroup = groups[0];

  const tabs = document.getElementById('packageTabs');
  tabs.innerHTML = groups.map((group, i) =>
    '<button class="chip" type="button" role="tab" aria-selected="' + (i === 0) + '" data-group="' + escapeHtml(group) + '">' + escapeHtml(group) + '</button>'
  ).join('');

  tabs.addEventListener('click', function (event) {
    const button = event.target.closest('button');
    if (!button) { return; }
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b === button));
    currentPackageGroup = button.dataset.group;
    showPackages();
  });
  showPackages();
}

function showPackages() {
  document.getElementById('packageGrid').innerHTML = allPackages
    .filter((pack) => pack.category === currentPackageGroup)
    .map(function (pack) {
      const chosen = cart.packages.includes(pack.id);
      const seats = pack.guests_seated ? '<p class="package-seats">Up to ' + pack.guests_seated + ' guests seated</p>' : '';
      const lines = pack.includes.map((line) => '<li>' + escapeHtml(line) + '</li>').join('');
      const button = chosen
        ? '<button class="btn btn-outline" type="button" data-remove-package="' + pack.id + '">Added ✓ · Remove</button>'
        : '<button class="btn btn-gold" type="button" data-add-package="' + pack.id + '">Add this package</button>';
      return '<article class="package-card' + (chosen ? ' is-chosen' : '') + '">'
        + '<h3>' + escapeHtml(pack.name) + '</h3>'
        + '<p class="package-price">' + kes(pack.price) + '</p>' + seats
        + '<ul>' + lines + '</ul>' + button + '</article>';
    }).join('');
}

document.getElementById('packageGrid').addEventListener('click', function (event) {
  const add = event.target.closest('[data-add-package]');
  const remove = event.target.closest('[data-remove-package]');
  if (add) { cart.packages.push(Number(add.dataset.addPackage)); }
  if (remove) { cart.packages = cart.packages.filter((id) => id !== Number(remove.dataset.removePackage)); }
  if (add || remove) { changed(); showPackages(); }
});


// ---------- 4. Items ----------
function showCategoryChips() {
  const chips = document.getElementById('categoryChips');
  chips.innerHTML = '<button class="chip" type="button" aria-selected="true" data-category="all">All</button>'
    + priceGroups.map((group) => '<button class="chip" type="button" aria-selected="false" data-category="' + group.slug + '">' + escapeHtml(group.name) + '</button>').join('');

  chips.addEventListener('click', function (event) {
    const button = event.target.closest('button');
    if (!button) { return; }
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b === button));
    currentCategory = button.dataset.category;
    showItems();
  });
}

// "80-Seater Tent + Lining" -> "8T": first letter of the first two words, for the tile
function initials(name) {
  return name.split(/[\s(–-]+/).filter((word) => /^[A-Za-z0-9]/.test(word)).slice(0, 2).map((word) => word[0].toUpperCase()).join('');
}

function itemCard(item) {
  const qty = cart.items[item.id] || 0;
  const description = item.description ? '<p class="item-desc">' + escapeHtml(item.description) + '</p>' : '';
  const control = qty
    ? '<div class="stepper">'
      + '<button type="button" data-step="-1" aria-label="One less ' + escapeHtml(item.name) + '">−</button>'
      + '<input type="number" min="0" max="9999" inputmode="numeric" value="' + qty + '" aria-label="How many ' + escapeHtml(item.name) + '">'
      + '<button type="button" data-step="1" aria-label="One more ' + escapeHtml(item.name) + '">+</button></div>'
    : '<button class="add-btn" type="button" data-step="1">Add</button>';
  // DESIGN-PROMPT.md: every item shows "unit price x quantity = line total"
  const lineTotal = qty
    ? '<p class="line-total">' + qty + ' × ' + item.unit_price.toLocaleString('en-KE') + ' = <b>' + kes(qty * item.unit_price) + '</b></p>'
    : '';
  return '<article class="item-card' + (qty ? ' is-chosen' : '') + '" data-id="' + item.id + '">'
    + '<div class="item-tile" aria-hidden="true">' + initials(item.name) + '</div>'
    + '<div><h3>' + escapeHtml(item.name) + '</h3>' + description
    + '<div class="item-row"><span class="item-price">' + kes(item.unit_price) + ' <small>each</small></span>' + control + '</div></div>'
    + lineTotal + '</article>';
}

function showItems() {
  const items = [];
  priceGroups.forEach(function (group) {
    if (currentCategory === 'all' || currentCategory === group.slug) { items.push(...group.items); }
  });
  document.getElementById('itemGrid').innerHTML = items.map(itemCard).join('');
}

// Redraw just ONE card (faster than redrawing all 48, and the page doesn't jump)
function refreshItem(id) {
  const old = document.querySelector('.item-card[data-id="' + id + '"]');
  if (!old) { return; }
  const box = document.createElement('div');
  box.innerHTML = itemCard(itemsById[id]);
  old.replaceWith(box.firstElementChild);
}

function setQty(id, qty) {
  qty = Math.max(0, Math.min(9999, Math.floor(Number(qty) || 0)));   // a whole number from 0 to 9999
  if (qty === 0) { delete cart.items[id]; } else { cart.items[id] = qty; }
  refreshItem(id);
  changed();
}

const itemGrid = document.getElementById('itemGrid');
itemGrid.addEventListener('click', function (event) {
  const button = event.target.closest('[data-step]');
  if (!button) { return; }
  const id = button.closest('.item-card').dataset.id;
  setQty(id, (cart.items[id] || 0) + Number(button.dataset.step));
  // after the redraw, keep the keyboard on the same card
  const card = document.querySelector('.item-card[data-id="' + id + '"]');
  const next = card && (card.querySelector('[data-step="' + button.dataset.step + '"]') || card.querySelector('[data-step]'));
  if (next) { next.focus(); }
});
// Typing a number in the box: "change" happens when the customer leaves the box or presses Enter
itemGrid.addEventListener('change', function (event) {
  if (!event.target.matches('.stepper input')) { return; }
  setQty(event.target.closest('.item-card').dataset.id, event.target.value);
});


// ---------- 5. Custom requests ----------
document.getElementById('customForm').addEventListener('submit', function (event) {
  event.preventDefault();   // stop the browser from reloading the page (what a form does by default)
  const nameBox = document.getElementById('customName');
  const qtyBox = document.getElementById('customQty');
  const error = document.getElementById('customError');
  const name = nameBox.value.trim();
  const qty = Math.floor(Number(qtyBox.value));

  if (!name) { return showError('Type the item you need first.', nameBox); }
  if (!(qty >= 1 && qty <= 9999)) { return showError('Use a whole number from 1 to 9999.', qtyBox); }

  error.hidden = true;
  cart.custom.push({ name: name.slice(0, 120), qty: qty });
  nameBox.value = '';
  qtyBox.value = 1;
  changed();

  function showError(message, box) {
    error.textContent = message;   // plain words next to the field (DESIGN-PROMPT.md)
    error.hidden = false;
    box.focus();
  }
});


// ---------- 6. Totals ----------
// Turns the cart into lines with prices, the shape calculateQuote() expects
function cartLines() {
  const lines = [];
  Object.keys(cart.items).forEach(function (id) {
    const item = itemsById[id];
    lines.push({ kind: 'item', id: item.id, name: item.name, qty: cart.items[id], unit_price: item.unit_price });
  });
  cart.packages.forEach(function (id) {
    const pack = packagesById[id];
    lines.push({ kind: 'package', id: pack.id, name: pack.category + ': ' + pack.name, qty: 1, unit_price: pack.price });
  });
  cart.custom.forEach(function (request, index) {
    lines.push({ kind: 'custom', index: index, name: request.name, qty: request.qty, unit_price: null });
  });
  return lines;
}

// Called after EVERY change: save, redraw the summary and the quote bar
function changed() {
  saveCart();
  updateTotals();
  const bar = document.querySelector('.quote-bar');
  bar.classList.remove('bump');
  void bar.offsetWidth;          // restart the little "bump" animation
  bar.classList.add('bump');
}

let shownTotal = 0;
function updateTotals() {
  const quote = calculateQuote(cartLines(), { depositPercent: depositPercent });

  // Lines in the summary
  const summaryLines = document.getElementById('summaryLines');
  summaryLines.innerHTML = quote.lines.length
    ? quote.lines.map(function (line) {
        const amount = line.line_total == null ? '<span class="pending">Price pending</span>' : '<span>' + line.line_total.toLocaleString('en-KE') + '</span>';
        return '<div class="summary-line"><span>' + line.qty + ' × ' + escapeHtml(line.name) + '</span>' + amount + '</div>';
      }).join('')
    : '<p class="empty-note">Nothing yet. Add a package or items to start.</p>';

  // Notes under the total
  const notes = [];
  if (quote.pendingCount) { notes.push(quote.pendingCount + ' custom request' + (quote.pendingCount > 1 ? 's' : '') + ': the office will add the price.'); }
  if (cart.packages.length) { notes.push('Packages exclude tents and chairs: add them from the list.'); }
  const note = document.getElementById('summaryNote');
  note.textContent = notes.join(' ');
  note.hidden = notes.length === 0;

  // How many different things are chosen (lines, not pieces: 200 plates is 1 line)
  const count = quote.lines.length;
  document.getElementById('barCount').textContent = count + (count === 1 ? ' thing chosen' : ' things chosen');
  document.getElementById('summaryDeposit').textContent = kes(quote.deposit);

  countTo(quote.total);
}

// The total "counts up" to its new value (DESIGN-PROMPT.md); instant if motion is switched off
let animation = null;
function countTo(target) {
  const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = shownTotal;
  const startTime = performance.now();
  const duration = lessMotion ? 0 : 500;
  cancelAnimationFrame(animation);

  function frame(now) {
    const progress = duration ? Math.min(1, (now - startTime) / duration) : 1;   // 0 -> 1
    const eased = 1 - Math.pow(1 - progress, 3);                                    // fast at first, then gently
    shownTotal = Math.round(start + (target - start) * eased);
    document.getElementById('summaryTotal').textContent = kes(shownTotal);
    document.getElementById('barTotal').textContent = kes(shownTotal);
    if (progress < 1) { animation = requestAnimationFrame(frame); }
  }
  animation = requestAnimationFrame(frame);
}


// ---------- 7. Review (priced by the server) ----------
const review = document.getElementById('review');
const reviewBody = document.getElementById('reviewBody');

async function openReview() {
  reviewBody.innerHTML = '<p class="empty-note">Checking prices…</p>';
  if (!review.open) { review.showModal(); }

  if (!cartLines().length) {
    reviewBody.innerHTML = '<p class="empty-note">Your quote is empty. Add a package or items to begin.</p>';
    return;
  }

  // Send WHAT and HOW MANY only. The server looks up every price itself.
  const choice = {
    items: Object.keys(cart.items).map((id) => ({ id: Number(id), qty: cart.items[id] })),
    packages: cart.packages.map((id) => ({ id: id })),
    custom: cart.custom
  };

  try {
    const answer = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },   // "the body is JSON"
      body: JSON.stringify(choice)                        // turn the object into JSON text
    });
    const data = await answer.json();
    if (!answer.ok) {          // ok = false for 400/500 answers: show the server's plain-words message
      reviewBody.innerHTML = '<p class="field-error">' + escapeHtml(data.error) + '</p>';
      return;
    }
    showReview(data);
  } catch (error) {
    reviewBody.innerHTML = '<p class="field-error">Could not reach the server. Check your connection and try again.</p>';
  }
}

function showReview(quote) {
  const lines = quote.lines.map(function (line, i) {
    const isCustom = line.unit_price == null;
    const meta = isCustom
      ? line.qty + ' requested · the office will reply with a price'
      : line.qty + ' × ' + kes(line.unit_price);
    const amount = isCustom ? '<span class="pending">Price pending</span>' : kes(line.line_total);
    return '<div class="review-line' + (isCustom ? ' is-custom' : '') + '">'
      + '<span class="name">' + escapeHtml(line.name) + '</span><span class="amount">' + amount + '</span>'
      + '<span class="meta">' + meta + '</span>'
      + '<button class="link-btn" type="button" data-remove-line="' + i + '">Remove</button></div>';
  }).join('');

  reviewBody.innerHTML = lines
    + '<div class="summary-total"><span>Total</span><b>' + kes(quote.total) + '</b></div>'
    + '<div class="summary-deposit"><span>Deposit to hold the date (' + depositPercent + '%)</span><b>' + kes(quote.deposit) + '</b></div>'
    + '<p class="summary-note">Transport outside Kilifi town is added by the office.</p>';

  // Remember which cart entry each line came from, so "Remove" knows what to delete
  reviewBody.dataset.lines = JSON.stringify(quote.lines.map((line) => ({ kind: line.kind, id: line.id })));
}

reviewBody.addEventListener('click', function (event) {
  const button = event.target.closest('[data-remove-line]');
  if (!button) { return; }
  const line = JSON.parse(reviewBody.dataset.lines)[Number(button.dataset.removeLine)];
  if (line.kind === 'item') { delete cart.items[line.id]; refreshItem(line.id); }
  if (line.kind === 'package') { cart.packages = cart.packages.filter((id) => id !== line.id); showPackages(); }
  if (line.kind === 'custom') {
    // custom lines come last, in cart order: their position among custom lines = their index in cart.custom
    const customIndex = Number(button.dataset.removeLine) - (cartLines().length - cart.custom.length);
    cart.custom.splice(customIndex, 1);
  }
  changed();
  openReview();   // ask the server again for the new total
});

document.querySelectorAll('[data-open-review]').forEach((button) => button.addEventListener('click', openReview));
document.getElementById('reviewClose').addEventListener('click', () => review.close());
document.getElementById('reviewBack').addEventListener('click', () => review.close());
review.addEventListener('click', (event) => { if (event.target === review) { review.close(); } });   // tap outside = close


loadPage();
