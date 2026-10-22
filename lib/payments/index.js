// payments/index.js: the ONE door to payments (CLAUDE.md "Payments").
//
// The rest of the system only talks to this file. It never needs to know which provider
// (manual, simulated, M-Pesa, card later) did the work.
//   startPayment(bookingId, method, phone, amount, extra) -> { paymentId, status } or { error }
//   receiveCallback(providerName, body)                   -> a provider tells us the result
//   amountDue(bookingId)        -> what the CUSTOMER pays now (deposit first, then the balance)
//   paymentSummary(bookingId)   -> paid so far, left to pay, the list of payments
//   onlineMethod()              -> which provider the customer's "Pay" button uses, or null
//
// Golden rules:
//   * amounts come from the booking on the server, never from the browser
//   * a booking becomes deposit_paid / fully_paid ONLY because of a successful payment row
//   * the same callback twice = one payment (store.markResult)

const store = require('./store');

// Every provider has start() and handleCallback(). Adding M-Pesa later = one more line here.
const PROVIDERS = {
  manual: require('./manual'),
  simulated: require('./simulated')
};

// Statuses in which money can be paid
const PAYABLE = ['quoted', 'deposit_paid'];


// ---------- How much is paid and left ----------
function paymentSummary(bookingId) {
  const booking = store.getBookingForPayment(bookingId);
  if (!booking) { return null; }
  const paid = store.paidSoFar(bookingId);
  return {
    paid: paid,
    leftToPay: Math.max(0, booking.total - paid),
    depositLeft: Math.max(0, booking.deposit - paid),
    payments: store.listPayments(bookingId)
  };
}

// The customer pays the rest of the deposit first; once the date is held, the rest of the balance
function amountDue(bookingId) {
  const booking = store.getBookingForPayment(bookingId);
  if (!booking || !PAYABLE.includes(booking.status)) { return 0; }
  const s = paymentSummary(bookingId);
  return booking.status === 'quoted' ? s.depositLeft : s.leftToPay;
}

// Which provider the customer's Pay button uses: M-Pesa once its keys are in .env (later),
// the pretend one while building, nothing on a live site without M-Pesa keys.
function onlineMethod() {
  if (process.env.NODE_ENV !== 'production') { return 'simulated'; }
  return null;
}


// ---------- Start a payment ----------
// method: 'manual' (office), 'simulated' or later 'mpesa' (customer)
// extra:  for manual payments: { method: 'M-Pesa' | 'Cash' | 'Bank', receiptCode, note }
function startPayment(bookingId, method, phone, amount, extra) {
  const provider = PROVIDERS[method];
  if (!provider) { return { error: 'This payment method is not available.' }; }

  const booking = store.getBookingForPayment(bookingId);
  if (!booking) { return { error: 'Booking not found.' }; }
  if (!PAYABLE.includes(booking.status)) {
    return { error: booking.status === 'fully_paid' ? 'This booking is already fully paid.' : 'Payments start once the office has confirmed the quote.' };
  }

  // The amount must be a whole number of shillings, and never more than what is left
  const left = paymentSummary(bookingId).leftToPay;
  amount = Number(amount);
  if (!Number.isInteger(amount) || amount < 1) { return { error: 'Amount: a whole number of shillings, 1 or more.' }; }
  if (amount > left) { return { error: 'That is more than the ' + left.toLocaleString('en-KE') + ' left to pay.' }; }

  const result = provider.start({ bookingId: bookingId, amount: amount, phone: phone, method: extra && extra.method, receiptCode: extra && extra.receiptCode, note: extra && extra.note });
  if (result.error) { return { error: result.error }; }

  // The same M-Pesa code can't be recorded twice (a typing slip, or two people recording the same SMS)
  if (result.status === 'success' && result.receiptCode && store.findSuccessByReceipt(result.receiptCode)) {
    return { error: 'This code ' + result.receiptCode + ' is already recorded.' };
  }

  const paymentId = store.addPayment({
    bookingId: bookingId, provider: method, method: result.method, amount: amount, phone: phone,
    status: result.status, providerRef: result.providerRef, receiptCode: result.receiptCode, raw: result.raw
  });
  if (result.status === 'success') { applyToBooking(bookingId); }
  return { paymentId: paymentId, status: result.status };
}


// ---------- A provider tells us the result ----------
function receiveCallback(providerName, body) {
  // CLAUDE.md: log every callback (it is also saved in payments.raw_callback)
  console.log('[payments] callback from ' + providerName + ': ' + JSON.stringify(body).slice(0, 500));

  const provider = PROVIDERS[providerName];
  if (!provider) { return { error: 'Unknown provider.' }; }
  const result = provider.handleCallback(body);
  if (result.error) { return result; }

  const outcome = store.markResult(result.providerRef, result);
  if (!outcome.payment) { return { error: 'No payment waiting for ' + result.providerRef }; }
  if (!outcome.changed) { return { ok: true, repeat: true }; }   // seen before: do nothing again (idempotent)

  // The money that arrived must be what we asked for (when the provider tells us the amount)
  if (result.status === 'success' && result.amount != null && Number(result.amount) !== outcome.payment.amount) {
    console.error('[payments] amount mismatch on payment ' + outcome.payment.id + ': asked ' + outcome.payment.amount + ', got ' + result.amount);
  }
  if (result.status === 'success') { applyToBooking(outcome.payment.booking_id); }
  return { ok: true };
}


// ---------- The ONLY place a booking becomes deposit_paid / fully_paid ----------
function applyToBooking(bookingId) {
  const booking = store.getBookingForPayment(bookingId);
  const paid = store.paidSoFar(bookingId);
  if (paid >= booking.total && booking.total > 0) {
    store.setBookingStatus(bookingId, 'fully_paid');
  } else if (paid >= booking.deposit && booking.status === 'quoted') {
    store.setBookingStatus(bookingId, 'deposit_paid');   // the date is now held
  }
}


function getPayment(id) { return store.getPayment(id); }

module.exports = { startPayment, receiveCallback, amountDue, paymentSummary, onlineMethod, getPayment };
