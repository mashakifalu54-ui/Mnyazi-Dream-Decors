// payments/simulated.js: a PRETEND M-Pesa, for building and testing on your own computer
// (CLAUDE.md: "a simulate payment button in development").
//
// It behaves like the real thing will (lib/payments/mpesa.js, later):
//   1. start() answers "pending" at once (on a real phone, the PIN prompt pops up now)
//   2. a few seconds later Safaricom calls our server back with the result.
//      Here we call ourselves back with a message shaped like Daraja's STK callback.
// Test tip: a phone number ending in 000 pretends the customer cancelled.
//
// Never used on the live site: lib/payments/index.js only picks it when NODE_ENV is not 'production'.

const crypto = require('node:crypto');

const DELAY_MS = 4000;   // how long the "customer" takes to type their PIN

function start(request) {
  const checkoutId = 'SIM-' + crypto.randomBytes(8).toString('hex');   // like Daraja's CheckoutRequestID
  const cancelled = /000$/.test(String(request.phone));

  // The pretend callback, built the way Daraja sends it (Body.stkCallback ...)
  const callback = {
    Body: {
      stkCallback: {
        CheckoutRequestID: checkoutId,
        ResultCode: cancelled ? 1032 : 0,        // 0 = paid, 1032 = cancelled by the user
        ResultDesc: cancelled ? 'Request cancelled by user' : 'The service request is processed successfully.',
        CallbackMetadata: cancelled ? undefined : {
          Item: [
            { Name: 'Amount', Value: request.amount },
            { Name: 'MpesaReceiptNumber', Value: 'SIM' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7) },
            { Name: 'PhoneNumber', Value: Number(request.phone) }
          ]
        }
      }
    }
  };

  // Call ourselves back later. require() here (not at the top) because index.js also requires this file.
  setTimeout(function () {
    require('./index').receiveCallback('simulated', callback);
  }, DELAY_MS);

  return { status: 'pending', method: 'M-Pesa', providerRef: checkoutId, raw: { simulated: true } };
}

// Reads a Daraja-shaped callback: same code will work for the real mpesa.js
function handleCallback(body) {
  const cb = body && body.Body && body.Body.stkCallback;
  if (!cb || !cb.CheckoutRequestID) { return { error: 'Not an STK callback.' }; }
  const items = (cb.CallbackMetadata && cb.CallbackMetadata.Item) || [];
  const find = (name) => (items.find((item) => item.Name === name) || {}).Value;
  return {
    providerRef: cb.CheckoutRequestID,
    status: cb.ResultCode === 0 ? 'success' : (cb.ResultCode === 1032 ? 'cancelled' : 'failed'),
    receiptCode: find('MpesaReceiptNumber') || null,
    amount: find('Amount'),
    raw: body
  };
}

module.exports = { start, handleCallback };
