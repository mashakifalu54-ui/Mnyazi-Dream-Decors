/*
  status.js: fills the customer's private status page (/status/<code>).
  1. Read the code from the address and ask the server for the booking
  2. Title: booking number, event, date, area
  3. Timeline: received -> checked -> quote sent -> deposit paid -> confirmed (DESIGN-PROMPT.md)
  4. The quote lines and totals (worked out on the server with quote-math.js)
  Uses kes() and escapeHtml() from common.js.
*/

// ---------- 1. Ask the server ----------
// location.pathname is the address after the website name: '/status/9f3a...'
// split('/') cuts it at every '/', pop() takes the last piece: the code
const token = location.pathname.split('/').pop();

async function loadStatus() {
  try {
    const answer = await fetch('/api/status/' + encodeURIComponent(token));
    const data = await answer.json();
    if (!answer.ok) { return showProblem(data.error); }
    showBooking(data);
  } catch (error) {
    showProblem('Could not reach the server. Check your connection and try again.');
  }
}

function showProblem(message) {
  document.getElementById('statusTitle').textContent = 'Booking not found';
  document.getElementById('statusIntro').textContent = message;
  document.querySelector('.status-page').hidden = true;
}


// ---------- 2. Title ----------
// '2026-12-12' -> 'Saturday 12 December 2026'
function niceDate(dateText) {
  const date = new Date(dateText + 'T12:00:00');
  return date.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function showBooking(booking) {
  document.title = booking.bookingNo + ' | Mnyazi Dream Decor';
  document.getElementById('statusTitle').textContent = 'Booking ' + booking.bookingNo;
  document.getElementById('statusIntro').textContent = 'Hello ' + booking.firstName + '. '
    + booking.eventType + ' on ' + niceDate(booking.eventDate)
    + (booking.area ? ', ' + booking.area : '')
    + (booking.guests ? ', ' + booking.guests + ' guests' : '') + '.';

  // The WhatsApp button starts the message with the booking number
  const text = encodeURIComponent('Hello Mnyazi Dream Decor, about my booking ' + booking.bookingNo + ': ');
  document.getElementById('statusWhatsApp').href = 'https://wa.me/254793463223?text=' + text;

  showTimeline(booking);
  showLines(booking.quote);
}


// ---------- 3. Timeline ----------
// For each booking status: how many steps are done (the next one is "now")
const STEPS_DONE = {
  new: 1, needs_price: 1, quoted: 3, deposit_paid: 4, fully_paid: 5, completed: 5
};

function showTimeline(booking) {
  const timeline = document.getElementById('timeline');

  // Declined or cancelled: no timeline, just a clear message
  if (booking.status === 'declined' || booking.status === 'cancelled') {
    timeline.innerHTML = '<li class="now"><b>This booking was ' + booking.status + '.</b><span>Please call or WhatsApp the office if you have questions.</span></li>';
    return;
  }

  const steps = [
    ['Request received', 'We have your list and your event details.'],
    ['Office checks your date', booking.status === 'needs_price'
      ? 'Checking stock and pricing your custom item. Usually within 24 hours.'
      : 'Checking that every item is free on your date. Usually within 24 hours.'],
    ['Quote sent on WhatsApp', 'With the final total and the M-Pesa details.'],
    ['Deposit paid', 'Your date is held once the deposit arrives.'],
    ['Confirmed', 'We deliver and set up on the day.']
  ];
  const done = STEPS_DONE[booking.status] || 1;

  timeline.innerHTML = steps.map(function (step, i) {
    const state = i < done ? 'done' : (i === done ? 'now' : '');   // finished, happening now, or later
    return '<li class="' + state + '"><b>' + step[0] + '</b><span>' + step[1] + '</span></li>';
  }).join('');
}


// ---------- 4. Quote lines ----------
function showLines(quote) {
  const lines = quote.lines.map(function (line) {
    const pending = line.unit_price == null;
    const amount = pending ? '<span class="pending">Price pending</span>' : kes(line.line_total);
    const meta = pending ? line.qty + ' requested' : line.qty + ' × ' + kes(line.unit_price);
    return '<div class="review-line' + (pending ? ' is-custom' : '') + '">'
      + '<span class="name">' + escapeHtml(line.name) + '</span><span class="amount">' + amount + '</span>'
      + '<span class="meta">' + meta + '</span></div>';
  }).join('');

  const extra = (quote.transportFee ? '<div class="summary-line"><span>Transport</span><span>' + kes(quote.transportFee) + '</span></div>' : '')
    + (quote.discount ? '<div class="summary-line"><span>Discount</span><span>− ' + kes(quote.discount) + '</span></div>' : '');

  document.getElementById('statusLines').innerHTML = lines + extra
    + '<div class="summary-total"><span>Total' + (quote.pendingCount ? ' so far' : '') + '</span><b>' + kes(quote.total) + '</b></div>'
    + '<div class="summary-deposit"><span>Deposit to hold the date</span><b>' + kes(quote.deposit) + '</b></div>'
    + (quote.transportFee ? '' : '<p class="summary-note">Transport outside Kilifi town is added by the office.</p>');
}


loadStatus();
