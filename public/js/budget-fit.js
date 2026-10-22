/*
  budget-fit.js: the budget finder's thinking (CLAUDE.md "Budget finder").
  Pure arithmetic, no page code, so it can be tested on its own and reused
  by the server later (like quote-math.js).

  findPackagesThatFit(packages, wish)

  packages: the list from /api/packages
  wish (every field optional, a customer can skip any of them):
    { budgetMin: 40000, budgetMax: 60000,   (an exact amount = min and max the same)
      guests: 120,
      category: 'White Wedding' }            (from the event type; empty = all groups)

  returns: [ { pack, fits, overBy, seatsShort, cheaperOption } , ... ]  best fit first
    fits          true  = the price is within the budget
    overBy        how many shillings over the budget (0 when it fits)
    seatsShort    how many guests the package does NOT seat (extra seats are hired on top)
    cheaperOption the next cheaper package in the same group, to suggest when over budget
*/

// "Slightly over" (CLAUDE.md: stays visible, marked "KES X over") = up to 25% above the budget
const OVER_ALLOWANCE = 0.25;

function findPackagesThatFit(packages, wish) {
  wish = wish || {};
  const max = wish.budgetMax != null ? wish.budgetMax : Infinity;   // no top = anything fits
  const guests = wish.guests || 0;

  // 1. Only the group that suits the event type (Wedding -> White Wedding ...)
  let candidates = wish.category ? packages.filter((p) => p.category === wish.category) : packages.slice();
  if (candidates.length === 0) { candidates = packages.slice(); }   // nothing in that group: show all

  // 2. Work out for each package: in budget? enough seats?
  const results = candidates.map(function (pack) {
    const overBy = Math.max(0, pack.price - max);
    const seatsShort = guests && pack.guests_seated ? Math.max(0, guests - pack.guests_seated) : 0;
    return { pack: pack, fits: overBy === 0, overBy: overBy, seatsShort: seatsShort, cheaperOption: null };
  });

  // 3. Hide packages far over the budget (more than 25% over)
  const shown = results.filter((r) => r.fits || r.overBy <= max * OVER_ALLOWANCE);

  // 4. When a package is over budget, suggest the next cheaper one in the same group that fits
  shown.forEach(function (r) {
    if (r.fits) { return; }
    const cheaper = results
      .filter((x) => x.fits && x.pack.category === r.pack.category)
      .sort((a, b) => b.pack.price - a.pack.price)[0];   // the most expensive one that still fits
    r.cheaperOption = cheaper ? cheaper.pack : null;
  });

  // 5. Best fit first:
  //    in budget before over budget; then enough seats before too few;
  //    then, inside the budget, the one that uses MOST of it (closest to what they planned);
  //    over the budget, the one that is LEAST over.
  shown.sort(function (a, b) {
    if (a.fits !== b.fits) { return a.fits ? -1 : 1; }
    if ((a.seatsShort > 0) !== (b.seatsShort > 0)) { return a.seatsShort > 0 ? 1 : -1; }
    return a.fits ? b.pack.price - a.pack.price : a.overBy - b.overBy;
  });

  return shown;
}

// Node (tests, server later) can require() it; the browser just gets the function.
if (typeof module !== 'undefined') {
  module.exports = { findPackagesThatFit };
}
