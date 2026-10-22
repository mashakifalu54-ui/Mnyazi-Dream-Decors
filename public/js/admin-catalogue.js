/*
  admin-catalogue.js: the Items, prices & packages page (/admin/catalogue.html).
  1. Load everything and switch between the three tabs
  2. Items: one small form per item (name, category, price, stock, shown), a filter, "Add an item"
  3. Packages: one form per package (group, name, price, seats, shown, included lines), "Add a package"
  4. Settings: deposit % and how long a quote is valid
  Every form saves on its own; the server checks the values again (lib/office-catalogue.js).
  Uses api() and the login from admin-common.js, kes() and escapeHtml() from common.js.
*/

let data = null;              // what the server sent: { categories, items, packages, finderGroups, settings }
let categoryFilter = 'all';

async function loadCatalogue() {
  try {
    data = await api('/api/admin/catalogue');
    showAll();
  } catch (problem) {
    document.getElementById('itemList').innerHTML = '<p class="field-error">' + escapeHtml(problem.message) + '</p>';
  }
}

function showAll() {
  showCategoryFilter();
  showItems();
  document.getElementById('newItem').innerHTML = itemForm(null);
  showPackages();
  document.getElementById('newPackage').innerHTML = packageForm(null);
  showSettings();
}


// ---------- 1. Tabs ----------
document.getElementById('tabs').addEventListener('click', function (event) {
  const button = event.target.closest('[data-tab]');
  if (!button) { return; }
  document.querySelectorAll('#tabs .chip').forEach((chip) => chip.setAttribute('aria-selected', chip === button));
  ['items', 'packages', 'settings'].forEach(function (name) {
    document.getElementById('tab-' + name).hidden = name !== button.dataset.tab;
  });
});


// ---------- 2. Items ----------
function showCategoryFilter() {
  document.getElementById('categoryFilter').innerHTML =
    '<button class="chip" type="button" data-category="all" aria-selected="' + (categoryFilter === 'all') + '">All ' + data.items.length + '</button>'
    + data.categories.map((c) => '<button class="chip" type="button" data-category="' + c.id + '" aria-selected="' + (String(categoryFilter) === String(c.id)) + '">' + escapeHtml(c.name) + '</button>').join('');
}

document.getElementById('categoryFilter').addEventListener('click', function (event) {
  const button = event.target.closest('[data-category]');
  if (!button) { return; }
  categoryFilter = button.dataset.category;
  showCategoryFilter();
  showItems();
});

function showItems() {
  const items = data.items.filter((item) => categoryFilter === 'all' || String(item.category_id) === String(categoryFilter));
  document.getElementById('itemList').innerHTML = '<div class="item-edit-list">' + items.map(itemForm).join('') + '</div>';
}

// One form for one item. item = null makes the empty "Add an item" form.
function itemForm(item) {
  const isNew = !item;
  item = item || { id: '', name: '', description: '', category_id: data.categories[0].id, unit_price: '', stock_count: '', per_guests: '', is_visible: 1, office_note: '' };
  const categoryOptions = data.categories.map((c) =>
    '<option value="' + c.id + '"' + (c.id === item.category_id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>').join('');
  const value = (v) => escapeHtml(v == null ? '' : v);

  return '<form class="item-edit' + (item.is_visible ? '' : ' is-hidden-item') + '" data-kind="item" data-id="' + item.id + '">'
    + (item.office_note ? '<p class="fit-tip">Note: ' + escapeHtml(item.office_note) + '</p>' : '')
    + '<div class="item-edit-row">'
    +   '<label class="field grow">Name<input name="name" maxlength="80" required value="' + value(item.name) + '"></label>'
    +   '<label class="field">Category<select name="categoryId">' + categoryOptions + '</select></label>'
    +   '<label class="field small">Price (KES)<input name="unitPrice" type="number" min="0" step="50" inputmode="numeric" required value="' + value(item.unit_price) + '"></label>'
    +   '<label class="field small">We own<input name="stockCount" type="number" min="0" inputmode="numeric" placeholder="?" value="' + value(item.stock_count) + '"></label>'
    +   '<label class="check">' + '<input type="checkbox" name="isVisible"' + (item.is_visible ? ' checked' : '') + '> Shown</label>'
    + '</div>'
    + '<details class="more"><summary>Description, office note, guest count' + (item.per_guests ? ' (1 per ' + item.per_guests + ')' : '') + '</summary>'
    +   '<label class="field">Description (customers see it)<input name="description" maxlength="300" value="' + value(item.description) + '"></label>'
    +   '<label class="field">Office note (only the office sees it)<input name="officeNote" maxlength="300" value="' + value(item.office_note) + '"></label>'
    +   '<label class="field">Follows the guest count: one per how many guests? (1 = per guest, 10 = per 10 guests; empty = no)<input name="perGuests" type="number" min="1" max="1000" inputmode="numeric" value="' + value(item.per_guests) + '"></label>'
    + '</details>'
    + '<div class="form-foot"><button class="btn btn-navy btn-small" type="submit">' + (isNew ? 'Add item' : 'Save') + '</button>'
    + '<span class="form-message" role="status"></span></div>'
    + '</form>';
}


// ---------- 3. Packages ----------
function showPackages() {
  document.getElementById('packageList').innerHTML = data.packages.map(packageForm).join('');
}

function packageForm(pack) {
  const isNew = !pack;
  pack = pack || { id: '', category: '', name: '', price: '', guests_seated: '', is_visible: 1, includes: [] };
  const value = (v) => escapeHtml(v == null ? '' : v);
  // Suggest the existing group names; a new name makes a new group
  const groups = Array.from(new Set(data.packages.map((p) => p.category)));
  const listId = 'groups-' + (pack.id || 'new');
  const notInFinder = pack.category && !data.finderGroups.includes(pack.category);

  return '<form class="status-card package-edit' + (pack.is_visible ? '' : ' is-hidden-item') + '" data-kind="package" data-id="' + pack.id + '">'
    + '<div class="package-edit-row">'
    +   '<label class="field">Group<input name="category" list="' + listId + '" maxlength="40" required value="' + value(pack.category) + '"></label>'
    +   '<datalist id="' + listId + '">' + groups.map((g) => '<option value="' + escapeHtml(g) + '">').join('') + '</datalist>'
    +   '<label class="field">Name<input name="name" maxlength="60" required value="' + value(pack.name) + '"></label>'
    +   '<label class="field">Price (KES)<input name="price" type="number" min="0" step="500" inputmode="numeric" required value="' + value(pack.price) + '"></label>'
    +   '<label class="field">Guests seated<input name="guestsSeated" type="number" min="1" inputmode="numeric" placeholder="none" value="' + value(pack.guests_seated) + '"></label>'
    + '</div>'
    + (notInFinder ? '<p class="fit-tip">The budget finder only knows the groups ' + data.finderGroups.map(escapeHtml).join(', ') + '. This group shows for other event types.</p>' : '')
    + '<label class="field">What\'s included (one line each)<textarea name="includes" rows="6" maxlength="3000">' + escapeHtml(pack.includes.join('\n')) + '</textarea></label>'
    + '<label class="check"><input type="checkbox" name="isVisible"' + (pack.is_visible ? ' checked' : '') + '> Shown to customers</label>'
    + '<div class="form-foot"><button class="btn btn-navy btn-small" type="submit">' + (isNew ? 'Add package' : 'Save') + '</button>'
    + '<span class="form-message" role="status"></span></div>'
    + '</form>';
}


// ---------- 4. Settings ----------
function showSettings() {
  document.getElementById('settingsForm').innerHTML = '<h2>Settings</h2>'
    + '<label class="field">Deposit to hold the date (%)<input name="depositPercent" type="number" min="0" max="100" inputmode="numeric" value="' + data.settings.depositPercent + '"></label>'
    + '<label class="field">A quote is valid for (days)<input name="quoteValidDays" type="number" min="1" max="90" inputmode="numeric" value="' + data.settings.quoteValidDays + '"></label>'
    + '<label class="field">M-Pesa Paybill or Till number (printed on quotes and invoices)<input name="mpesaPaybill" inputmode="numeric" maxlength="7" placeholder="not set yet" value="' + escapeHtml(data.settings.mpesaPaybill) + '"></label>'
    + '<label class="field">Balance due how many days before the event?<input name="balanceDueDays" type="number" min="0" max="60" inputmode="numeric" placeholder="not set yet" value="' + escapeHtml(data.settings.balanceDueDays) + '"></label>'
    + '<p class="summary-note">New bookings use the new deposit %. Bookings already made keep theirs.</p>'
    + '<div class="form-foot"><button class="btn btn-navy btn-small" type="submit">Save settings</button><span class="form-message" role="status"></span></div>';
}


// ---------- Saving (one listener for every form on the page) ----------
document.getElementById('adminApp').addEventListener('submit', async function (event) {
  const form = event.target;
  event.preventDefault();
  const message = form.querySelector('.form-message');
  const button = form.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(form));   // { name: '...', unitPrice: '600', ... }
  values.isVisible = form.elements.isVisible ? form.elements.isVisible.checked : undefined;   // unticked boxes are missing from FormData

  let address;
  if (form.id === 'settingsForm') { address = '/api/admin/settings'; }
  else if (form.dataset.kind === 'item') { address = '/api/admin/items' + (form.dataset.id ? '/' + form.dataset.id : ''); }
  else { address = '/api/admin/packages' + (form.dataset.id ? '/' + form.dataset.id : ''); }

  button.disabled = true;
  message.className = 'form-message';
  message.textContent = 'Saving…';
  try {
    const isNew = form.dataset.id === '';
    data = await api(address, values);
    if (isNew) {
      showAll();                                  // the new one appears in the list
      flashMessage('Added.');
    } else {
      message.textContent = 'Saved ✓';
      message.classList.add('is-ok');
      form.classList.toggle('is-hidden-item', values.isVisible === false);
      if (form.dataset.kind === 'item') { showCategoryFilter(); }
    }
  } catch (problem) {
    message.textContent = problem.message;
    message.classList.add('is-error');
  }
  button.disabled = false;
});

// Short message at the bottom of the screen (the same look as on the booking page)
function flashMessage(text) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add('is-on');
  setTimeout(() => toast.classList.remove('is-on'), 2500);
}

startAdminPage(loadCatalogue);
