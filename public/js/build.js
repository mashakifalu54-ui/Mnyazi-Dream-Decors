/*
  build.js: the Build your event page.
  1. What the customer has picked (the "cart"), kept in the browser so a refresh doesn't lose it
  2. Load prices and packages from the server
  3. Packages: tabs and cards with Add / Remove
  4. Items: category chips and cards with Add, then − 3 +
  5. Custom requests ("price pending")
  6. Totals: uses calculateQuote() from quote-math.js (the same maths as the server)
  7. Review -> Event details -> Sent: the quote priced by the SERVER (/api/quote),
     the details form, and saving the booking (/api/bookings)
  8. Budget finder: event type, guests, budget, area -> packages that fit (js/budget-fit.js),
     and the budget bar under the total
  Uses kes() and escapeHtml() from common.js, normalizeKenyanPhone() from kenya-phone.js.
*/

// ---------- 1. The cart ----------
// items:    { itemId: qty }        e.g. { 1: 3, 2: 2 }  = 3 tents, 2 side covers
// packages: [ packageId, ... ]     each package once
// custom:   [ { name, qty }, ... ] requests the office will price
// wish:     what the customer told the budget finder, or null:
//           { eventType, guests, area, budgetMin, budgetMax, budgetLabel, rangeId }
//           Kept with the cart so step 4 can save it on the booking.
let cart = { items: {}, packages: [], custom: [], wish: null };

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
let eventTypes = [];                  // [ { name, package_category } ]
let budgetRanges = [];

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
    eventTypes = options.eventTypes;
    budgetRanges = options.budgetRanges;
    setUpFinder(options.areas);
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
  updateBudgetBar(quote.total);
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


// ---------- 7. Review -> Event details -> Sent ----------
// The pop-up has three steps (the indicator at the top shows where you are):
//   step 1  Items:   the quote, priced by the SERVER (/api/quote)
//   step 2  Details: name, phone, event, date, area, notes
//   step 3  Sent:    the booking is saved (/api/bookings); booking number and private status link
const review = document.getElementById('review');
const reviewBody = document.getElementById('reviewBody');
const reviewFoot = document.getElementById('reviewFoot');
let lastQuoteOk = false;   // step 2 is only allowed when the server priced the quote without a problem

// The event details are kept in the browser too, so going Back (or a refresh) never loses them
const DETAILS_KEY = 'mnyazi-details';
let details = {};
try { details = JSON.parse(localStorage.getItem(DETAILS_KEY)) || {}; } catch (error) { details = {}; }
function saveDetails() {
  try { localStorage.setItem(DETAILS_KEY, JSON.stringify(details)); } catch (error) { /* storage blocked */ }
}

// Highlights the current step at the top: 1, 2 or 3
function setStep(step) {
  ['stepItems', 'stepDetails', 'stepSent'].forEach(function (id, i) {
    document.getElementById(id).classList.toggle('is-current', i < step);
  });
  document.getElementById('reviewTitle').textContent = ['Your quote', 'Event details', 'Request sent'][step - 1];
}

// What we send to the server: WHAT and HOW MANY only. The server looks up every price itself.
function currentChoice() {
  return {
    items: Object.keys(cart.items).map((id) => ({ id: Number(id), qty: cart.items[id] })),
    packages: cart.packages.map((id) => ({ id: id })),
    custom: cart.custom
  };
}

// ----- Step 1: Items -----
async function openReview() {
  setStep(1);
  lastQuoteOk = false;
  reviewBody.innerHTML = '<p class="empty-note">Checking prices…</p>';
  showItemsButtons();
  if (!review.open) { review.showModal(); }

  if (!cartLines().length) {
    reviewBody.innerHTML = '<p class="empty-note">Your quote is empty. Add a package or items to begin.</p>';
    return;
  }

  try {
    const answer = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },   // "the body is JSON"
      body: JSON.stringify(currentChoice())               // turn the object into JSON text
    });
    const data = await answer.json();
    if (!answer.ok) {          // ok = false for 400/500 answers: show the server's plain-words message
      reviewBody.innerHTML = '<p class="field-error">' + escapeHtml(data.error) + '</p>';
      return;
    }
    showReview(data);
    lastQuoteOk = true;
    showItemsButtons();
  } catch (error) {
    reviewBody.innerHTML = '<p class="field-error">Could not reach the server. Check your connection and try again.</p>';
  }
}

function showItemsButtons() {
  reviewFoot.innerHTML = '<button class="btn btn-outline" type="button" data-action="close">Add more items</button>'
    + '<button class="btn btn-gold" type="button" data-action="details"' + (lastQuoteOk ? '' : ' disabled') + '>Continue to event details</button>';
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

// ----- Step 2: Event details -----
function showDetailsForm() {
  setStep(2);
  // Start from what they typed before; if nothing, from the budget finder answers
  const wish = cart.wish || {};
  const value = (key, fallback) => escapeHtml(details[key] != null && details[key] !== '' ? details[key] : (fallback || ''));
  const typeOptions = eventTypes.map((t) => t.name);
  const chosenType = details.eventType || wish.eventType || '';
  const chosenArea = details.area || wish.area || '';
  const areaBox = document.getElementById('finderArea');                       // reuse the area list the finder already loaded
  const areaOptions = Array.from(areaBox.options).slice(1).map((o) => o.value);

  // Every input has a <label>; each error goes in the <p class="field-error"> right under its box
  reviewBody.innerHTML = '<form id="detailsForm" class="details-form" novalidate>'
    + field('name', 'Your name', '<input id="dName" name="name" autocomplete="name" maxlength="80" value="' + value('name') + '">')
    + field('phone', 'Phone (Kenyan, for WhatsApp and M-Pesa)', '<input id="dPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0712 345 678" value="' + value('phone') + '">')
    + field('eventType', 'Type of event', '<select id="dEventType" name="eventType"><option value="">Choose…</option>'
        + typeOptions.map((t) => '<option' + (t === chosenType ? ' selected' : '') + '>' + escapeHtml(t) + '</option>').join('') + '</select>')
    + field('eventDate', 'Event date', '<input id="dEventDate" name="eventDate" type="date" min="' + tomorrowText() + '" value="' + value('eventDate') + '">')
    + field('guests', 'Guests', '<input id="dGuests" name="guests" type="number" min="1" max="5000" inputmode="numeric" placeholder="e.g. 120" value="' + value('guests', wish.guests) + '">')
    + field('area', 'Area', '<select id="dArea" name="area"><option value="">Choose…</option>'
        + areaOptions.map((a) => '<option' + (a === chosenArea ? ' selected' : '') + '>' + escapeHtml(a) + '</option>').join('') + '</select>')
    + field('notes', 'Venue and notes (optional)', '<textarea id="dNotes" name="notes" maxlength="1000" rows="3" placeholder="Venue name, colours, set-up time…">' + value('notes') + '</textarea>', true)
    + '<p class="summary-note full">The office checks every item is free on your date, then sends your quote and the M-Pesa details on WhatsApp. Nothing is charged now.</p>'
    + '</form>';

  reviewFoot.innerHTML = '<button class="btn btn-outline" type="button" data-action="back">Back</button>'
    + '<button class="btn btn-gold" type="button" data-action="send">Send booking request</button>';

  // Some boxes start filled in (from last time, or from the budget finder): remember those values now,
  // otherwise only what the customer TYPES would count, and a pre-filled "Wedding" would be missed.
  const form = document.getElementById('detailsForm');
  Array.from(form.elements).forEach(function (box) { details[box.name] = box.value; });
  saveDetails();

  // Save as they type, so Back never loses anything
  form.addEventListener('input', function (event) {
    details[event.target.name] = event.target.value;
    saveDetails();
  });
  document.getElementById('dName').focus();

  function field(name, label, control, full) {
    return '<label class="field' + (full ? ' full' : '') + '">' + label + control
      + '<span class="field-error" id="err-' + name + '" role="alert" hidden></span></label>';
  }
}

// Tomorrow as 'YYYY-MM-DD' (the earliest event date allowed)
function tomorrowText() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

// Show one error under its box and move the cursor there
function showFieldError(name, message) {
  reviewBody.querySelectorAll('.field-error').forEach((el) => { el.hidden = true; });
  const box = document.getElementById('err-' + name);
  if (box) {
    box.textContent = message;
    box.hidden = false;
    const input = box.parentElement.querySelector('input, select, textarea');
    if (input) { input.focus(); }
  } else {
    alert(message);   // an error that belongs to no box (rare)
  }
}

// Quick checks in the browser, so the customer hears about a mistake straight away.
// The server checks everything again: these are for comfort, not for safety.
function checkDetailsInBrowser() {
  if (!(details.name || '').trim()) { return showFieldError('name', 'Please add your name.'); }
  if (!normalizeKenyanPhone(details.phone)) { return showFieldError('phone', 'Use a Kenyan number like 0712 345 678 or +254 712 345 678.'); }
  if (!details.eventType) { return showFieldError('eventType', 'Please choose the type of event.'); }
  if (!details.eventDate || details.eventDate < tomorrowText()) { return showFieldError('eventDate', 'Pick an event date from tomorrow onwards.'); }
  if (details.guests && !(Number(details.guests) >= 1 && Number(details.guests) <= 5000 && Number.isInteger(Number(details.guests)))) {
    return showFieldError('guests', 'Guests: use a whole number, for example 120.');
  }
  return true;
}

async function sendBooking(button) {
  if (checkDetailsInBrowser() !== true) { return; }
  button.disabled = true;               // stop a double tap from sending twice
  button.textContent = 'Sending…';

  const wish = cart.wish || {};
  const body = {
    choice: currentChoice(),
    details: Object.assign({}, details, { budgetMin: wish.budgetMin, budgetMax: wish.budgetMax })
  };

  try {
    const answer = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await answer.json();
    if (!answer.ok) {
      button.disabled = false;
      button.textContent = 'Send booking request';
      return showFieldError(data.field, data.error);
    }
    showSent(data);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Send booking request';
    showFieldError(null, 'Could not reach the server. Check your connection and try again.');
  }
}

// ----- Step 3: Sent -----
function showSent(result) {
  setStep(3);
  const statusLink = location.origin + '/status/' + result.token;
  const firstName = (details.name || '').trim().split(' ')[0];
  const shareText = encodeURIComponent('My Mnyazi Dream Decor booking ' + result.bookingNo + ': ' + statusLink);

  reviewBody.innerHTML = '<div class="sent">'
    + '<div class="sent-seal" aria-hidden="true">✓</div>'
    + '<h3>Thank you, ' + escapeHtml(firstName) + '.</h3>'
    + '<p>Your request <b>' + escapeHtml(result.bookingNo) + '</b> is with the office. They check your date and reply on WhatsApp, usually within 24 hours.</p>'
    + '<p class="summary-note">Save your private status link. It shows your booking any time:</p>'
    + '<p class="status-link"><a href="/status/' + result.token + '">' + escapeHtml(statusLink) + '</a></p>'
    + '<p><a href="/api/status/' + result.token + '/pdf" target="_blank" rel="noopener">Download your quote (PDF)</a></p>'
    + '</div>';

  reviewFoot.innerHTML = '<a class="btn btn-outline" href="https://wa.me/?text=' + shareText + '" target="_blank" rel="noopener">Save it on WhatsApp</a>'
    + '<a class="btn btn-gold" href="/status/' + result.token + '">Open my booking</a>';

  // The request is sent: empty the cart and the form for the next visit
  cart = { items: {}, packages: [], custom: [], wish: null };
  details = {};
  saveCart();
  saveDetails();
  updateTotals();
  showItems();
  showPackages();
  finderResults.innerHTML = '';
  finderForm.reset();          // empty the budget questions too
}

// ----- Buttons and clicks -----
reviewFoot.addEventListener('click', function (event) {
  const button = event.target.closest('[data-action]');
  if (!button) { return; }
  const action = button.dataset.action;
  if (action === 'close') { review.close(); }
  if (action === 'details' && lastQuoteOk) { showDetailsForm(); }
  if (action === 'back') { openReview(); }
  if (action === 'send') { sendBooking(button); }
});

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
review.addEventListener('click', (event) => { if (event.target === review) { review.close(); } });   // tap outside = close


// ---------- 8. Budget finder ----------
const finderForm = document.getElementById('finderForm');
const finderResults = document.getElementById('finderResults');

// Fill the drop-downs and chips from /api/options, and put back what the customer chose last time
function setUpFinder(areas) {
  const eventBox = document.getElementById('finderEvent');
  eventTypes.forEach((type) => eventBox.add(new Option(type.name, type.name)));   // new Option(text, value)
  const areaBox = document.getElementById('finderArea');
  areas.forEach((area) => areaBox.add(new Option(area, area)));

  // One radio button per budget range, dressed as a chip (the <label> is what you see and tap)
  document.getElementById('budgetChips').innerHTML = budgetRanges.map((range) =>
    '<label class="chip chip-radio"><input type="radio" name="budget" value="' + range.id + '">' + escapeHtml(range.label) + '</label>'
  ).join('');

  const wish = cart.wish;
  if (wish) {
    eventBox.value = wish.eventType || '';
    areaBox.value = wish.area || '';
    document.getElementById('finderGuests').value = wish.guests || '';
    if (wish.rangeId) {
      const radio = finderForm.querySelector('input[name="budget"][value="' + wish.rangeId + '"]');
      if (radio) { radio.checked = true; }
    } else if (wish.budgetMax) {
      document.getElementById('finderExact').value = wish.budgetMax;
    }
    showFinderResults(wish);   // came back to the page: show their results again
  }
}

// Typing an exact amount un-ticks the chip, and ticking a chip clears the exact amount (only one budget at a time)
finderForm.addEventListener('input', function (event) {
  if (event.target.id === 'finderExact' && event.target.value) {
    finderForm.querySelectorAll('input[name="budget"]').forEach((radio) => { radio.checked = false; });
  }
  if (event.target.name === 'budget') { document.getElementById('finderExact').value = ''; }
});

finderForm.addEventListener('submit', function (event) {
  event.preventDefault();
  const error = document.getElementById('finderError');
  error.hidden = true;

  const eventType = document.getElementById('finderEvent').value;
  const area = document.getElementById('finderArea').value;
  const guestsText = document.getElementById('finderGuests').value;
  const exactText = document.getElementById('finderExact').value;
  const ticked = finderForm.querySelector('input[name="budget"]:checked');

  // Check the numbers, with plain words next to the form (DESIGN-PROMPT.md)
  const guests = guestsText ? Math.floor(Number(guestsText)) : null;
  if (guestsText && !(guests >= 1 && guests <= 5000)) { return showFinderError('Guests: use a whole number, for example 120.'); }
  const exact = exactText ? Math.round(Number(exactText)) : null;
  if (exactText && !(exact >= 1000)) { return showFinderError('Budget: type an amount of at least 1,000, or tap one of the ranges.'); }

  // Turn the choices into a "wish". An exact amount is saved as min = max (CLAUDE.md).
  const wish = { eventType: eventType || null, area: area || null, guests: guests, budgetMin: null, budgetMax: null, budgetLabel: null, rangeId: null };
  if (exact) {
    wish.budgetMin = exact;
    wish.budgetMax = exact;
    wish.budgetLabel = kes(exact);
  } else if (ticked) {
    const range = budgetRanges.find((r) => String(r.id) === ticked.value);
    wish.budgetMin = range.min_amount;
    wish.budgetMax = range.max_amount;
    wish.budgetLabel = 'KES ' + range.label;
    wish.rangeId = range.id;
  }

  cart.wish = wish;
  saveCart();
  updateTotals();      // the budget bar appears under the total
  showFinderResults(wish);

  function showFinderError(message) {
    error.textContent = message;
    error.hidden = false;
  }
});

function showFinderResults(wish) {
  const type = eventTypes.find((t) => t.name === wish.eventType);
  const category = type ? type.package_category : null;
  const results = findPackagesThatFit(allPackages, {
    budgetMin: wish.budgetMin, budgetMax: wish.budgetMax, guests: wish.guests, category: category
  });

  // Nothing fits: say so kindly, name the cheapest choice, and point to single items
  if (results.length === 0) {
    const group = allPackages.filter((p) => !category || p.category === category);
    const cheapest = group.slice().sort((a, b) => a.price - b.price)[0];
    finderResults.innerHTML = '<div class="finder-empty"><p><b>No package fits ' + escapeHtml(wish.budgetLabel || 'that budget') + '.</b> '
      + (cheapest ? 'The lowest is ' + escapeHtml(cheapest.name) + ' at ' + kes(cheapest.price) + '. ' : '')
      + 'You can also pick single items below and watch the total.</p>'
      + '<a class="btn btn-outline" href="#items">Pick single items</a></div>';
    return;
  }

  const fitCount = results.filter((r) => r.fits).length;
  const heading = '<h3 class="finder-heading">' + fitCount + ' package' + (fitCount === 1 ? '' : 's') + ' fit'
    + (wish.budgetLabel ? ' ' + escapeHtml(wish.budgetLabel) : ' your event')
    + (category ? ' · ' + escapeHtml(category) : '') + '</h3>';

  finderResults.innerHTML = heading + '<div class="package-grid">' + results.map(function (r) {
    const pack = r.pack;
    const chosen = cart.packages.includes(pack.id);

    // "uses KES X of your budget" or "KES X over" (CLAUDE.md)
    let badge = '';
    if (r.fits && wish.budgetMax) {
      badge = '<p class="fit-badge">Uses ' + kes(pack.price) + ' of your ' + kes(wish.budgetMax) + '</p>';
    } else if (!r.fits) {
      badge = '<p class="fit-badge is-over">' + kes(r.overBy) + ' over your budget</p>';
    }
    const tips = [];
    if (!r.fits && r.cheaperOption) {
      tips.push('Or choose ' + escapeHtml(r.cheaperOption.name) + ' (' + kes(r.cheaperOption.price) + '), or ask the office what can be left out.');
    }
    if (r.seatsShort) {
      tips.push('Seats ' + pack.guests_seated + ': for ' + wish.guests + ' guests, hire ' + r.seatsShort + ' more seats on top.');
    }
    const lines = pack.includes.map((line) => '<li>' + escapeHtml(line) + '</li>').join('');
    const button = chosen
      ? '<button class="btn btn-outline" type="button" data-remove-package="' + pack.id + '">Added ✓ · Remove</button>'
      : '<button class="btn btn-gold" type="button" data-add-package="' + pack.id + '">Add this package</button>';
    return '<article class="package-card' + (chosen ? ' is-chosen' : '') + '">'
      + badge
      + '<h3>' + escapeHtml(pack.category === category ? pack.name : pack.category + ': ' + pack.name) + '</h3>'
      + '<p class="package-price">' + kes(pack.price) + '</p>'
      + (pack.guests_seated ? '<p class="package-seats">Up to ' + pack.guests_seated + ' guests seated</p>' : '')
      + (tips.length ? '<p class="fit-tip">' + tips.join(' ') + '</p>' : '')
      + '<ul>' + lines + '</ul>' + button + '</article>';
  }).join('') + '</div>';
}

// Add / Remove in the results works like the package cards further down
finderResults.addEventListener('click', function (event) {
  const add = event.target.closest('[data-add-package]');
  const remove = event.target.closest('[data-remove-package]');
  if (add) { cart.packages.push(Number(add.dataset.addPackage)); }
  if (remove) { cart.packages = cart.packages.filter((id) => id !== Number(remove.dataset.removePackage)); }
  if (add || remove) { changed(); showPackages(); showFinderResults(cart.wish); }
});

// The budget bar under the total: "KES 62,000 of 80,000 used, 18,000 left" (CLAUDE.md)
function updateBudgetBar(total) {
  const bar = document.getElementById('budgetBar');
  const wish = cart.wish;
  if (!wish || !wish.budgetMax) { bar.hidden = true; return; }   // no budget, or "Above 100,000": nothing to measure against

  const budget = wish.budgetMax;
  const usedPercent = Math.min(100, Math.round(total / budget * 100));   // at most 100 for the drawing
  bar.hidden = false;
  bar.classList.toggle('is-near', total <= budget && total >= budget * 0.9);   // gold when 90% is used
  bar.classList.toggle('is-over', total > budget);                              // warning colour when over
  document.getElementById('budgetFill').style.width = usedPercent + '%';
  document.getElementById('budgetText').textContent = total > budget
    ? kes(total - budget) + ' over your ' + kes(budget) + ' budget. You can still send it: the office will help you adjust.'
    : kes(total) + ' of ' + kes(budget) + ' used, ' + kes(budget - total) + ' left';
}


loadPage();
