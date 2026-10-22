/*
  status.js: fills the customer's private status page (/status/<code>).
  1. Read the code from the address and ask the server for the booking
  2. Title: booking number, event, date, area
  3. Timeline: received -> checked -> quote sent -> deposit paid -> confirmed (DESIGN-PROMPT.md)
  4. The quote lines and totals (worked out on the server with quote-math.js)
  5. Payments: paid, left, receipts, and the Pay button (CLAUDE.md "Browser confirmation":
     start the payment, then ask the server every 2.5 seconds until it is paid or failed)
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

  // Download button: a quote while the office is checking, an invoice once they have confirmed
  // (the same rule as lib/documents.js)
  const isQuote = ['new', 'needs_price', 'declined'].includes(booking.status);
  const pdf = document.createElement('a');
  pdf.className = 'btn btn-outline';
  pdf.href = '/api/status/' + encodeURIComponent(token) + '/pdf';
  pdf.target = '_blank';
  pdf.rel = 'noopener';
  pdf.textContent = isQuote ? 'Download quote (PDF)' : 'Download invoice (PDF)';
  document.getElementById('statusLines').appendChild(pdf);

  showPayments(booking);
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
    const unavailable = line.status === 'unavailable';      // the office can't supply it on that date
    const pending = !unavailable && line.unit_price == null;
    const amount = unavailable ? '<span class="pending">Not available</span>'
      : pending ? '<span class="pending">Price pending</span>' : kes(line.line_total);
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


// ---------- 5. Payments ----------
function showPayments(booking) {
  const p = booking.payments;
  const card = document.getElementById('paymentCard');
  const body = document.getElementById('paymentBody');
  // Nothing to show before the office confirms (no money is asked for yet)
  if (!p || (p.paid === 0 && p.dueNow === 0)) { card.hidden = true; return; }
  card.hidden = false;

  const receipts = p.list.map(function (x) {
    return '<li><span><b>' + kes(x.amount) + '</b> · ' + escapeHtml(x.method || 'M-Pesa') + (x.receiptCode ? ' · ' + escapeHtml(x.receiptCode) : '')
      + '<small>' + escapeHtml(x.date.slice(0, 10)) + '</small></span>'
      + '<a href="/api/status/' + encodeURIComponent(token) + '/receipts/' + x.id + '/pdf" target="_blank" rel="noopener">Receipt (PDF)</a></li>';
  }).join('');

  const isDeposit = booking.status === 'quoted';
  let pay = '';
  if (p.dueNow > 0 && p.payOnline) {
    pay = '<form id="payForm" class="pay-form" novalidate>'
      + '<label class="field">Safaricom number that will pay'
      + '<input id="payPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0712 345 678"></label>'
      + '<p class="field-error" id="payError" role="alert" hidden></p>'
      + '<button class="btn btn-gold" type="submit">Pay ' + (isDeposit ? 'deposit' : 'balance') + ' ' + kes(p.dueNow) + ' with M-Pesa</button>'
      + '<p class="summary-note">You will get an M-Pesa prompt on that phone. Enter your PIN to pay.</p>'
      + '</form>';
  } else if (p.dueNow > 0) {
    pay = '<p class="summary-note">To pay ' + kes(p.dueNow) + ', use the M-Pesa details on your invoice.</p>';
  }

  body.innerHTML = '<div class="summary-line"><span>Paid so far</span><span>' + kes(p.paid) + '</span></div>'
    + '<div class="summary-total"><span>Left to pay</span><b>' + kes(p.leftToPay) + '</b></div>'
    + (receipts ? '<ul class="payment-list">' + receipts + '</ul>' : '')
    + pay
    + (p.leftToPay === 0 ? '<p class="paid-note">Fully paid. Thank you!</p>' : '');
}

// The Pay button: start, then keep asking until we know (the server decides, the page only shows it)
document.getElementById('paymentBody').addEventListener('submit', async function (event) {
  if (event.target.id !== 'payForm') { return; }
  event.preventDefault();
  const error = document.getElementById('payError');
  const button = event.target.querySelector('button');
  const phone = document.getElementById('payPhone').value;
  error.hidden = true;

  if (!normalizeKenyanPhone(phone)) {
    error.textContent = 'Use a Kenyan number like 0712 345 678.';
    error.hidden = false;
    return;
  }

  button.disabled = true;
  try {
    const answer = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, phone: phone })   // no amount: the server works it out
    });
    const data = await answer.json();
    if (!answer.ok) { throw new Error(data.error); }

    // CLAUDE.md: show "Check your phone and enter your M-Pesa PIN", then poll
    document.getElementById('paymentBody').innerHTML = '<div class="waiting" role="status">'
      + '<span class="spinner" aria-hidden="true"></span>'
      + '<p><b>Check your phone and enter your M-Pesa PIN.</b><br>Paying ' + kes(data.amount) + '. This page updates by itself.</p></div>';
    waitForPayment(data.paymentId, 0);
  } catch (problem) {
    error.textContent = problem.message || 'Could not start the payment. Try again.';
    error.hidden = false;
    button.disabled = false;
  }
});

// Ask every 2.5 seconds, for at most 2 minutes
async function waitForPayment(paymentId, tries) {
  if (tries > 48) {
    document.getElementById('paymentBody').innerHTML = '<p class="field-error">We have not heard back from M-Pesa yet. If you paid, it will show here soon: refresh the page in a minute.</p>';
    return;
  }
  try {
    const answer = await fetch('/api/payments/' + paymentId + '?token=' + encodeURIComponent(token));
    const payment = await answer.json();
    if (payment.status === 'success') {
      await loadStatus();   // reload everything: timeline, totals, receipts
      flashPaid('Paid ' + kes(payment.amount) + '. Thank you! M-Pesa code ' + payment.receiptCode);
      return;
    }
    if (payment.status === 'failed' || payment.status === 'cancelled') {
      await loadStatus();
      const error = document.getElementById('payError');
      if (error) { error.textContent = 'The payment was ' + payment.status + '. Nothing was taken. You can try again.'; error.hidden = false; }
      return;
    }
  } catch (problem) { /* a moment without internet: just ask again */ }
  setTimeout(() => waitForPayment(paymentId, tries + 1), 2500);
}

function flashPaid(message) {
  const note = document.createElement('p');
  note.className = 'paid-note';
  note.setAttribute('role', 'status');
  note.textContent = message;
  document.querySelector('.status-page').prepend(note);
}

loadStatus();
