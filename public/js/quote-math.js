/*
  quote-math.js: the ONE place where quote totals are worked out (CLAUDE.md:
  "Totals are always calculated from lines in one function").

  The SAME file is used in two places:
    * the browser loads it with <script src="js/quote-math.js">, so the total
      updates instantly while the customer taps + and -
    * the server loads it with require('../public/js/quote-math'), so the
      total it saves can never be different from what the customer saw

  It only does arithmetic. It never looks up prices: whoever calls it passes
  the prices in (the server takes them from the database, never from the browser).
*/

/*
  calculateQuote(lines, options)

  lines:   [ { name: '80-Seater Tent + Lining', qty: 3, unit_price: 3000 }, ... ]
           unit_price null = custom item, price pending
  options: { depositPercent: 50, transportFee: 0, discount: 0 }   (all optional)

  returns: {
    lines: [ { ...each line, line_total: 9000 or null } ],
    subtotal:     the priced lines added up,
    transportFee, discount,
    total:        subtotal + transport - discount (never below 0),
    deposit:      depositPercent of the total, rounded to whole shillings,
    balance:      total - deposit,
    pendingCount: how many lines are still waiting for a price
  }
*/
function calculateQuote(lines, options) {
  options = options || {};
  const depositPercent = options.depositPercent != null ? options.depositPercent : 50;
  const transportFee = options.transportFee || 0;
  const discount = options.discount || 0;

  let subtotal = 0;
  let pendingCount = 0;

  // map() makes a new list: each line plus its line_total
  const priced = lines.map(function (line) {
    // A custom item has no price yet: its total is unknown, not 0
    if (line.unit_price == null) {
      pendingCount = pendingCount + 1;
      return Object.assign({}, line, { line_total: null });
    }
    const lineTotal = line.qty * line.unit_price;      // unit price x quantity = line total
    subtotal = subtotal + lineTotal;
    return Object.assign({}, line, { line_total: lineTotal });
  });

  const total = Math.max(0, subtotal + transportFee - discount);   // Math.max(0, ...) = never negative
  const deposit = Math.round(total * depositPercent / 100);       // Math.round = whole shillings

  return {
    lines: priced,
    subtotal: subtotal,
    transportFee: transportFee,
    discount: discount,
    total: total,
    deposit: deposit,
    balance: total - deposit,
    pendingCount: pendingCount
  };
}

// In Node, "module" exists: share the function with require().
// In the browser, "module" does not exist: calculateQuote is simply available to the page's other scripts.
if (typeof module !== 'undefined') {
  module.exports = { calculateQuote };
}
