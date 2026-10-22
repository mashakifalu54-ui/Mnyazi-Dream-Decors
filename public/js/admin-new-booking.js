/*
  admin-new-booking.js: the office makes a booking for a client (/admin/new-booking.html).
  1. Load the price list, packages and form lists
  2. Pick: packages (drop-down), items (search), custom items (name, how many, price if known)
  3. The chosen list with quantities, and the total (quote-math.js, the same maths as everywhere)
  4. Save: POST /api/admin/bookings, then open the new booking's page
  The server checks everything again and looks up every price itself (lib/office.js createOfficeBooking).
  Uses api() and the login from admin-common.js, normalizeKenyanPhone() from kenya-phone.js,
  calculateQuote() from quote-math.js, kes() and escapeHtml() from common.js.
*/

const form = document.getElementById('newBookingForm');
let allItems = [];           // every item on the price list: { id, name, unit_price, category }
let allPackages = [];
let depositPercent = 50;

// What the office has chosen so far
const chosen = {
  items: {},       // itemId -> qty
  packages: [],    // packageIds
  custom: []       // { name, qty, unitPrice (number or null) }
};


// ---------- 1. Load ----------
async function loadNewBooking() {
  try {
    const [groups, packages, options] = await Promise.all([
      fetch('/api/items').then((r) => r.json()),
      fetch('/api/packages').then((r) => r.json()),
      fetch('/api/options').then((r) => r.json())
    ]);
    groups.forEach((g) => g.items.forEach((item) => allItems.push(Object.assign({ category: g.name }, item))));
    allPackages = packages;
    depositPercent = options.depositPercent;

    const picker = document.getElementById('packagePicker');
    packages.forEach((p) => picker.add(new Option(p.category + ': ' + p.name + ' · ' + kes(p.price), p.id)));
    options.eventTypes.forEach((t) => document.getElementById('eventType').add(new Option(t.name, t.name)));
    options.areas.forEach((a) => document.getElementById('area').add(new Option(a, a)));

    // The office may book for today (the website starts at tomorrow)
    const today = new Date();
    document.getElementById('eventDate').min = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    showChosen();
  } catch (problem) {
    showError('Could not load the price list. Is the server running?');
  }
}


// ---------- 2. Picking ----------
document.getElementById('packagePicker').addEventListener('change', function (event) {
  const id = Number(event.target.value);
  if (id && !chosen.packages.includes(id)) { chosen.packages.push(id); }
  event.target.value = '';   // back to "Choose a package…"
  showChosen();
});

// Search: show up to 8 items whose name contains every word typed
document.getElementById('itemSearch').addEventListener('input', function (event) {
  const words = event.target.value.toLowerCase().split(/\s+/).filter(Boolean);
  const results = document.getElementById('itemResults');
  if (words.length === 0) { results.innerHTML = ''; return; }
  const matches = allItems.filter((item) => words.every((w) => (item.name + ' ' + item.category).toLowerCase().includes(w))).slice(0, 8);
  results.innerHTML = matches.length
    ? matches.map((item) => '<li><span>' + escapeHtml(item.name) + ' <small>' + kes(item.unit_price) + ' each</small></span>'
        + '<button class="btn btn-outline btn-small" type="button" data-add-item="' + item.id + '">Add</button></li>').join('')
    : '<li class="empty-note">No item matches. Use "Something not on the list" below.</li>';
});

document.getElementById('itemResults').addEventListener('click', function (event) {
  const button = event.target.closest('[data-add-item]');
  if (!button) { return; }
  const id = Number(button.dataset.addItem);
  chosen.items[id] = (chosen.items[id] || 0) + 1;
  showChosen();
  // Put the cursor in the new line's quantity box, ready to type how many
  const box = document.querySelector('[data-qty-item="' + id + '"]');
  if (box) { box.focus(); box.select(); }
});

document.getElementById('customAdd').addEventListener('click', function () {
  const name = document.getElementById('customName').value.trim();
  const qty = Math.floor(Number(document.getElementById('customQty').value));
  const priceText = document.getElementById('customPrice').value;
  if (!name) { return showError('Type the custom item’s name first.'); }
  if (!(qty >= 1 && qty <= 9999)) { return showError('How many: a whole number from 1 to 9999.'); }
  hideError();
  chosen.custom.push({ name: name.slice(0, 120), qty: qty, unitPrice: priceText === '' ? null : Math.round(Number(priceText)) });
  document.getElementById('customName').value = '';
  document.getElementById('customQty').value = 1;
  document.getElementById('customPrice').value = '';
  showChosen();
});


// ---------- 3. Chosen list and total ----------
function chosenLines() {
  const lines = [];
  Object.keys(chosen.items).forEach(function (id) {
    const item = allItems.find((i) => i.id === Number(id));
    lines.push({ kind: 'item', id: item.id, name: item.name, qty: chosen.items[id], unit_price: item.unit_price });
  });
  chosen.packages.forEach(function (id) {
    const p = allPackages.find((x) => x.id === id);
    lines.push({ kind: 'package', id: p.id, name: p.category + ': ' + p.name, qty: 1, unit_price: p.price });
  });
  chosen.custom.forEach(function (c, index) {
    lines.push({ kind: 'custom', index: index, name: c.name, qty: c.qty, unit_price: c.unitPrice });
  });
  return lines;
}

function showChosen() {
  const lines = chosenLines();
  document.getElementById('chosenLines').innerHTML = lines.length
    ? '<ul class="chosen-list">' + lines.map(function (line) {
        const qtyBox = line.kind === 'item'
          ? '<input type="number" min="1" max="9999" inputmode="numeric" value="' + line.qty + '" data-qty-item="' + line.id + '" aria-label="How many ' + escapeHtml(line.name) + '">'
          : '<span class="qty-fixed">' + line.qty + '</span>';
        const price = line.unit_price == null ? '<span class="pending">price later</span>' : kes(line.unit_price) + ' each';
        const removeKey = line.kind === 'custom' ? 'custom-' + line.index : line.kind + '-' + line.id;
        return '<li>' + qtyBox + '<span class="chosen-name">' + escapeHtml(line.name) + '<small>' + price + '</small></span>'
          + '<button class="link-btn" type="button" data-remove="' + removeKey + '">Remove</button></li>';
      }).join('') + '</ul>'
    : '<p class="empty-note">Nothing chosen yet.</p>';
  showTotals();
}

function showTotals() {
  const q = calculateQuote(chosenLines(), {
    depositPercent: depositPercent,
    transportFee: Math.max(0, Math.round(Number(form.elements.transportFee.value) || 0)),
    discount: Math.max(0, Math.round(Number(form.elements.discount.value) || 0))
  });
  const row = (label, value) => '<div class="summary-line"><span>' + label + '</span><span>' + value + '</span></div>';
  document.getElementById('newTotals').innerHTML = row('Items', kes(q.subtotal))
    + row('Transport', kes(q.transportFee))
    + (q.discount ? row('Discount', '– ' + kes(q.discount)) : '')
    + '<div class="summary-total"><span>Total</span><b>' + kes(q.total) + '</b></div>'
    + '<div class="summary-deposit"><span>Deposit (' + depositPercent + '%)</span><b>' + kes(q.deposit) + '</b></div>'
    + (q.pendingCount ? '<p class="fit-tip">' + q.pendingCount + ' custom item(s) without a price: it can’t be confirmed until they are priced.</p>' : '');
}

// Quantity typed in the chosen list, transport or discount: recount
form.addEventListener('input', function (event) {
  if (event.target.dataset.qtyItem) {
    const qty = Math.floor(Number(event.target.value));
    if (qty >= 1 && qty <= 9999) { chosen.items[event.target.dataset.qtyItem] = qty; }
    showTotals();
  }
  if (event.target.name === 'transportFee' || event.target.name === 'discount') { showTotals(); }
});

document.getElementById('chosenLines').addEventListener('click', function (event) {
  const button = event.target.closest('[data-remove]');
  if (!button) { return; }
  const [kind, key] = button.dataset.remove.split('-');
  if (kind === 'item') { delete chosen.items[key]; }
  if (kind === 'package') { chosen.packages = chosen.packages.filter((id) => id !== Number(key)); }
  if (kind === 'custom') { chosen.custom.splice(Number(key), 1); }
  showChosen();
});


// ---------- 4. Save ----------
form.addEventListener('submit', async function (event) {
  event.preventDefault();
  hideError();
  const f = form.elements;

  // Quick checks here; the server checks everything again
  if (!f.name.value.trim()) { return showError('Add the client’s name.', f.name); }
  if (!normalizeKenyanPhone(f.phone.value)) { return showError('Phone: a Kenyan number like 0712 345 678.', f.phone); }
  if (!f.eventType.value) { return showError('Choose the type of event.', f.eventType); }
  if (!f.eventDate.value) { return showError('Choose the event date.', f.eventDate); }
  if (chosenLines().length === 0) { return showError('Choose at least one package or item.'); }

  const button = document.getElementById('saveBtn');
  button.disabled = true;
  button.textContent = 'Saving…';
  try {
    const result = await api('/api/admin/bookings', {
      choice: {
        items: Object.keys(chosen.items).map((id) => ({ id: Number(id), qty: chosen.items[id] })),
        packages: chosen.packages.map((id) => ({ id: id })),
        custom: chosen.custom
      },
      details: {
        name: f.name.value, phone: f.phone.value, eventType: f.eventType.value, eventDate: f.eventDate.value,
        guests: f.guests.value, area: f.area.value, notes: f.notes.value
      },
      transportFee: Number(f.transportFee.value || 0),
      discount: Number(f.discount.value || 0),
      officeNotes: f.officeNotes.value,
      confirm: f.confirm.checked
    });
    // Open the new booking: from there the office sends it on WhatsApp, records payments, prints PDFs
    location.href = '/admin/booking.html?id=' + result.bookingId + '&created=1' + (result.warning ? '&warning=' + encodeURIComponent(result.warning) : '');
  } catch (problem) {
    showError(problem.message);
    button.disabled = false;
    button.textContent = 'Save booking';
  }
});

function showError(message, box) {
  const error = document.getElementById('newError');
  error.textContent = message;
  error.hidden = false;
  if (box) { box.focus(); }
}
function hideError() { document.getElementById('newError').hidden = true; }

startAdminPage(loadNewBooking);
