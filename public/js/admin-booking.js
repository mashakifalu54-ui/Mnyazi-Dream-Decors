/*
  admin-booking.js: one booking on the admin page (/admin/booking.html?id=3).
  1. Load the booking
  2. Show it: client and event, the lines (with stock on the event date), prices,
     transport, discount, notes, totals next to the customer's budget
  3. Save the office's changes
  4. Actions: Confirm & send quote, Send on WhatsApp, Decline, Cancel, Mark completed
  Uses api(), statusChip(), shortDate() from admin-common.js, prettyKenyanPhone() from kenya-phone.js,
  kes() and escapeHtml() from common.js.
*/

// ?id=3 in the address -> 3
const bookingId = Number(new URLSearchParams(location.search).get('id'));
const page = document.getElementById('bookingPage');
let booking = null;

async function loadBooking() {
  try {
    booking = await api('/api/admin/bookings/' + bookingId);
    showBooking();
  } catch (problem) {
    page.innerHTML = '<p class="field-error">' + escapeHtml(problem.message) + '</p>';
  }
}

// Can the office still change prices? Not once the booking is closed
function isOpen() {
  return !['completed', 'declined', 'cancelled'].includes(booking.status);
}


// ---------- 2. Show it ----------
function showBooking() {
  const b = booking;
  document.title = b.bookingNo + ' | Mnyazi Admin';
  const budget = b.budgetMax
    ? (b.budgetMin === b.budgetMax ? kes(b.budgetMax) : kes(b.budgetMin || 0) + ' – ' + kes(b.budgetMax))
    : (b.budgetMin ? 'Above ' + kes(b.budgetMin) : 'Not given');

  page.innerHTML = ''
    // Title row
    + '<div class="admin-title"><h1>' + escapeHtml(b.bookingNo) + '</h1>' + statusChip(b.status) + '</div>'
    + '<p class="summary-note">Received ' + escapeHtml(b.receivedAt) + '</p>'

    + '<div class="booking-grid">'

    // Left: client, event, lines
    + '<div class="booking-main">'
    +   '<section class="status-card facts">'
    +     fact('Client', escapeHtml(b.customerName), '<a href="tel:+' + b.phone + '">' + prettyKenyanPhone(b.phone) + '</a> · <a href="https://wa.me/' + b.phone + '" target="_blank" rel="noopener">WhatsApp</a>')
    +     fact('Event', escapeHtml(b.eventType) + (b.guests ? ' · ' + b.guests + ' guests' : ''), shortDate(b.eventDate))
    +     fact('Area', escapeHtml(b.area || 'Not given'), b.notes ? '“' + escapeHtml(b.notes) + '”' : '')
    +     fact('Budget', budget, 'from the budget finder')
    +   '</section>'

    +   '<form class="status-card" id="officeForm">'
    +     '<h2>Lines</h2>'
    +     '<div class="office-lines">' + b.lines.map(lineRow).join('') + '</div>'
    +     '<div class="office-extras">'
    +       '<label class="field">Transport (KES)<input type="number" min="0" step="100" inputmode="numeric" name="transportFee" value="' + b.transportFee + '"' + (isOpen() ? '' : ' disabled') + '></label>'
    +       '<label class="field">Discount (KES)<input type="number" min="0" step="100" inputmode="numeric" name="discount" value="' + b.discount + '"' + (isOpen() ? '' : ' disabled') + '></label>'
    +       '<label class="field full">Office notes (never shown to the client)<textarea name="officeNotes" rows="3" maxlength="2000">' + escapeHtml(b.officeNotes || '') + '</textarea></label>'
    +     '</div>'
    +     '<p class="field-error" id="saveError" role="alert" hidden></p>'
    +     (isOpen() ? '<button class="btn btn-navy" type="submit">Save changes</button>' : '')
    +   '</form>'
    + '</div>'

    // Right: totals and actions
    + '<aside class="booking-side">'
    +   '<section class="status-card">'
    +     '<h2>Total</h2>'
    +     totalsHtml(b.quote)
    +     '<p class="summary-note">Client\'s budget: ' + budget + '</p>'
    +   '</section>'
    +   '<section class="status-card" id="actions">' + actionsHtml() + '</section>'
    + '</aside>'

    + '</div>';
}

function fact(label, main, extra) {
  return '<div class="fact"><span>' + label + '</span><b>' + main + '</b>' + (extra ? '<small>' + extra + '</small>' : '') + '</div>';
}

// One line: name, qty, price (editable for custom items), available or not, stock on the date
function lineRow(line) {
  const custom = line.kind === 'custom';
  const unavailable = line.status === 'unavailable';
  const disabled = isOpen() ? '' : ' disabled';

  // Stock on the event date (price-list items only)
  let stock = '';
  if (line.kind === 'item') {
    if (line.stock == null) {
      stock = '<span class="stock">Stock not set · ' + line.bookedElsewhere + ' booked elsewhere that day</span>';
    } else {
      const free = line.stock - line.bookedElsewhere;
      const short = line.qty > free;
      stock = '<span class="stock' + (short ? ' is-short' : ' is-ok') + '">' + (short ? 'Only ' + Math.max(0, free) + ' free' : 'Free') + ' on ' + shortDate(booking.eventDate)
        + ' (own ' + line.stock + ', ' + line.bookedElsewhere + ' booked elsewhere)</span>';
    }
  }
  if (custom) {
    stock = line.unit_price == null
      ? '<span class="stock is-custom">Custom request: set a price, or mark it not available</span>'
      : '<span class="stock">Custom request, priced by the office</span>';
  }

  const price = custom
    ? '<label class="price-input">KES <input type="number" min="0" step="10" inputmode="numeric" name="price-' + line.id + '" value="' + (line.unit_price == null ? '' : line.unit_price) + '" placeholder="price each"' + disabled + ' aria-label="Price each for ' + escapeHtml(line.name) + '"></label>'
    : '<span class="price-fixed">' + kes(line.unit_price) + ' each</span>';

  return '<div class="office-line' + (unavailable ? ' is-unavailable' : '') + (custom ? ' is-custom' : '') + '" data-line="' + line.id + '">'
    + '<div class="office-line-main"><b>' + line.qty + ' × ' + escapeHtml(line.name) + '</b>' + stock + '</div>'
    + '<div class="office-line-price">' + price
    + '<label class="check"><input type="checkbox" name="unavailable-' + line.id + '"' + (unavailable ? ' checked' : '') + disabled + '> Not available</label></div>'
    + '</div>';
}

function totalsHtml(q) {
  const row = (label, value) => '<div class="summary-line"><span>' + label + '</span><span>' + value + '</span></div>';
  return row('Items', kes(q.subtotal))
    + row('Transport', kes(q.transportFee))
    + (q.discount ? row('Discount', '− ' + kes(q.discount)) : '')
    + '<div class="summary-total"><span>Total</span><b>' + kes(q.total) + '</b></div>'
    + '<div class="summary-deposit"><span>Deposit (' + booking.depositPercent + '%)</span><b>' + kes(q.deposit) + '</b></div>'
    + (q.pendingCount ? '<p class="fit-tip">' + q.pendingCount + ' line(s) still need a price.</p>' : '');
}


// ---------- 3. Save ----------
page.addEventListener('submit', async function (event) {
  if (event.target.id !== 'officeForm') { return; }
  event.preventDefault();
  const form = event.target;
  const error = document.getElementById('saveError');
  error.hidden = true;

  // Collect every line: its price (custom lines from the box, others unchanged) and whether it is available
  const lines = booking.lines.map(function (line) {
    const unavailable = form.elements['unavailable-' + line.id].checked;
    const priceBox = form.elements['price-' + line.id];
    const price = priceBox ? priceBox.value : line.unit_price;
    return {
      id: line.id,
      unitPrice: price === '' ? null : Number(price),
      status: unavailable ? 'unavailable' : (price === '' || price == null ? 'pending' : 'ok')
    };
  });

  try {
    booking = await api('/api/admin/bookings/' + bookingId, {
      transportFee: Number(form.elements.transportFee.value || 0),
      discount: Number(form.elements.discount.value || 0),
      officeNotes: form.elements.officeNotes.value,
      lines: lines
    });
    showBooking();
    flash('Saved.');
  } catch (problem) {
    error.textContent = problem.message;
    error.hidden = false;
  }
});


// ---------- 4. Actions ----------
function actionsHtml() {
  const s = booking.status;
  const parts = ['<h2>Next step</h2>'];

  if (s === 'needs_price') {
    parts.push('<p class="summary-note">Price every custom item (or tick "Not available"), save, then confirm.</p>');
  }
  if (s === 'new' && shortLines().length) {
    parts.push('<p class="fit-tip">Check stock first: not enough free on this date for '
      + shortLines().map((line) => escapeHtml(line.name)).join(', ') + '.</p>');
  }
  if (s === 'new') {
    parts.push('<button class="btn btn-gold" type="button" data-action="confirm">Confirm &amp; send quote</button>'
      + '<p class="summary-note">Marks it "Waiting deposit" and opens WhatsApp with the quote and the client\'s private link.</p>');
  }
  if (s === 'quoted') {
    parts.push('<p class="summary-note">Waiting for the ' + kes(booking.quote.deposit) + ' deposit. Recording M-Pesa payments comes in the next build step.</p>');
  }
  if (s === 'deposit_paid' || s === 'fully_paid') {
    parts.push('<button class="btn btn-navy" type="button" data-action="complete">Mark event completed</button>');
  }

  // WhatsApp the client at any time, with the private status link
  parts.push('<a class="btn btn-outline" href="' + whatsAppLink(false) + '" target="_blank" rel="noopener">Send on WhatsApp</a>');

  if (s === 'new' || s === 'needs_price') {
    parts.push('<details class="danger"><summary>Decline this request</summary>'
      + '<label class="field">Reason (kept in office notes)<input id="declineReason" maxlength="500" placeholder="e.g. fully booked on that date"></label>'
      + '<button class="btn btn-outline" type="button" data-action="decline">Decline</button></details>');
  }
  if (s === 'quoted' || s === 'deposit_paid' || s === 'fully_paid') {
    parts.push('<details class="danger"><summary>Cancel this booking</summary>'
      + '<label class="field">Reason (kept in office notes)<input id="declineReason" maxlength="500"></label>'
      + '<button class="btn btn-outline" type="button" data-action="cancel">Cancel booking</button></details>');
  }
  parts.push('<p class="field-error" id="actionError" role="alert" hidden></p>');
  return parts.join('');
}

// Lines that ask for more than is free on the event date (only items whose stock is known)
function shortLines() {
  return booking.lines.filter((line) => line.kind === 'item' && line.stock != null && line.status !== 'unavailable'
    && line.qty > line.stock - line.bookedElsewhere);
}

// wa.me link to the client with a ready message (CLAUDE.md: "Send on WhatsApp" with the private status link)
function whatsAppLink(isQuote) {
  const first = booking.customerName.split(' ')[0];
  const link = location.origin + '/status/' + booking.statusToken;
  const text = isQuote
    ? 'Hello ' + first + ', this is Mnyazi Dream Decor. Your quote ' + booking.bookingNo + ' for ' + shortDate(booking.eventDate)
      + ' is ready: total ' + kes(booking.quote.total) + '. A deposit of ' + kes(booking.quote.deposit) + ' holds your date. '
      + 'See the details here: ' + link
    : 'Hello ' + first + ', this is Mnyazi Dream Decor about your booking ' + booking.bookingNo + '. Your booking page: ' + link;
  return 'https://wa.me/' + booking.phone + '?text=' + encodeURIComponent(text);
}

page.addEventListener('click', async function (event) {
  const button = event.target.closest('[data-action]');
  if (!button) { return; }
  const action = button.dataset.action;
  const reasonBox = document.getElementById('declineReason');
  const error = document.getElementById('actionError');
  error.hidden = true;

  // Opening WhatsApp must happen straight after the click (browsers block pop-ups opened later),
  // so for "confirm" we open an empty tab now and send it to WhatsApp once the server says OK
  const whatsAppTab = action === 'confirm' ? window.open('', '_blank') : null;

  try {
    booking = await api('/api/admin/bookings/' + bookingId + '/status', { action: action, reason: reasonBox ? reasonBox.value : '' });
    if (whatsAppTab) { whatsAppTab.location = whatsAppLink(true); }
    showBooking();
    flash('Done: ' + STATUS_LABELS[booking.status] + '.');
  } catch (problem) {
    if (whatsAppTab) { whatsAppTab.close(); }
    error.textContent = problem.message;
    error.hidden = false;
  }
});

// A small message at the bottom that disappears by itself
function flash(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('is-on');
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => toast.classList.remove('is-on'), 2500);
}

startAdminPage(loadBooking);
