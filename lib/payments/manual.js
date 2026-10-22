// payments/manual.js: the office records a payment by hand (CLAUDE.md: build this FIRST,
// it always stays as a fallback, for example when M-Pesa is down or the client paid cash).
//
// Every provider has the same two functions, so lib/payments/index.js can use any of them:
//   start(request)           -> { status, receiptCode, raw }  or  { error }
//   handleCallback(body)     -> manual payments have no callback (nobody calls us back)

// An M-Pesa code: 10 letters and numbers, e.g. SJK7AB12CD. Cash/bank: any short reference.
const MPESA_CODE = /^[A-Z0-9]{10}$/;

function start(request) {
  const method = ['M-Pesa', 'Cash', 'Bank'].includes(request.method) ? request.method : 'M-Pesa';
  const code = String(request.receiptCode || '').trim().toUpperCase();

  if (method === 'M-Pesa' && !MPESA_CODE.test(code)) {
    return { error: 'M-Pesa code: 10 letters and numbers, like SJK7AB12CD (from the confirmation SMS).' };
  }
  return {
    status: 'success',            // the office saw the money arrive, so it counts straight away
    method: method,
    receiptCode: code || null,
    raw: { recordedBy: 'office', note: String(request.note || '').slice(0, 200) }
  };
}

function handleCallback() {
  return { error: 'Manual payments have no callback.' };
}

module.exports = { start, handleCallback };
