/*
  admin-list.js: the Booking requests page (/admin/).
  1. The big numbers at the top
  2. The table (a list of cards on phones), with filters
  Uses api(), statusChip(), shortDate() from admin-common.js, prettyKenyanPhone() from kenya-phone.js,
  kes() and escapeHtml() from common.js.
*/

let currentFilter = 'attention';

async function loadList() {
  try {
    const [stats, bookings] = await Promise.all([
      api('/api/admin/dashboard'),
      api('/api/admin/bookings?filter=' + currentFilter)
    ]);
    showStats(stats);
    showBookings(bookings);
  } catch (problem) {
    document.getElementById('bookingList').innerHTML = '<p class="field-error">' + escapeHtml(problem.message) + '</p>';
  }
}


// ---------- 1. Big numbers ----------
function showStats(stats) {
  const box = (number, label, warn) => '<div class="stat' + (warn && number ? ' is-warn' : '') + '"><b>' + number + '</b><span>' + label + '</span></div>';
  document.getElementById('stats').innerHTML =
    box(stats.needReply, 'Need a reply', true)
    + box(stats.customItems, 'Custom items to price', true)
    + box(stats.waitingDeposit, 'Waiting for deposit')
    + box(stats.confirmedThisMonth, 'Confirmed events this month');
}


// ---------- 2. The table ----------
function showBookings(bookings) {
  const list = document.getElementById('bookingList');
  if (bookings.length === 0) {
    list.innerHTML = '<p class="empty-note">Nothing here right now.</p>';
    return;
  }
  // A real <table> on laptops; admin.css turns each row into a card on phones
  list.innerHTML = '<table class="admin-table"><thead><tr>'
    + '<th>Booking</th><th>Client</th><th>Event date</th><th>Items</th><th class="num">Total (KES)</th><th>Status</th>'
    + '</tr></thead><tbody>'
    + bookings.map(function (b) {
        const items = b.lineCount + ' line' + (b.lineCount === 1 ? '' : 's') + (b.pendingCount ? ' · ' + b.pendingCount + ' to price' : '');
        return '<tr>'
          + '<td data-label="Booking"><a href="/admin/booking.html?id=' + b.id + '"><b>' + escapeHtml(b.bookingNo) + '</b></a></td>'
          + '<td data-label="Client">' + escapeHtml(b.customerName) + '<small>' + prettyKenyanPhone(b.phone) + '</small></td>'
          + '<td data-label="Event date">' + shortDate(b.eventDate) + '<small>' + escapeHtml(b.eventType) + (b.area ? ' · ' + escapeHtml(b.area) : '') + '</small></td>'
          + '<td data-label="Items">' + items + '</td>'
          + '<td data-label="Total" class="num">' + b.total.toLocaleString('en-KE') + (b.pendingCount ? '<small>+ price pending</small>' : '') + '</td>'
          + '<td data-label="Status">' + statusChip(b.status) + '</td>'
          + '</tr>';
      }).join('')
    + '</tbody></table>';
}

// ---------- Filters and refresh ----------
document.getElementById('filters').addEventListener('click', function (event) {
  const button = event.target.closest('[data-filter]');
  if (!button) { return; }
  document.querySelectorAll('#filters .chip').forEach((chip) => chip.setAttribute('aria-selected', chip === button));
  currentFilter = button.dataset.filter;
  loadList();
});
document.getElementById('refreshBtn').addEventListener('click', loadList);

startAdminPage(loadList);
