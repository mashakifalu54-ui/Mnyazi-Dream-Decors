/*
  prices.js: fills the Prices & packages page with data from the server.
  1. Ask the server for the packages and the price list (fetch)
  2. Packages: one tab per group (White Wedding, Church, Malozi / Kuhaswa), cards underneath
  3. Price list: one table per category, with jump links at the top
  Uses kes() and escapeHtml() from common.js.
*/

// ---------- 1. Ask the server ----------
// fetch() asks the server for an address and WAITS for the answer (that is what "await" means).
// "async function" = a function that is allowed to wait.
async function loadPage() {
  try {
    // Ask for both at the same time; Promise.all waits until both have arrived
    const [packages, priceList] = await Promise.all([
      fetch('/api/packages').then((answer) => answer.json()),
      fetch('/api/items').then((answer) => answer.json())
    ]);
    showPackages(packages);
    showPriceList(priceList);
  } catch (error) {
    // Usually means the server is not running (page opened by double-click instead of npm start)
    const message = '<p class="loading">Prices could not load. Please call or WhatsApp us on 0793 463 223.</p>';
    document.getElementById('packageGrid').innerHTML = message;
    document.getElementById('priceList').innerHTML = message;
    console.error(error);
  }
}


// ---------- 2. Packages ----------
let allPackages = [];

function showPackages(packages) {
  allPackages = packages;

  // The group names, each only once, in the order they come: ['White Wedding', 'Church', ...]
  const groups = [];
  packages.forEach(function (pack) {
    if (!groups.includes(pack.category)) { groups.push(pack.category); }
  });

  // One tab button per group
  const tabs = document.getElementById('packageTabs');
  tabs.innerHTML = groups.map(function (group, i) {
    return '<button class="chip" type="button" role="tab" aria-selected="' + (i === 0) + '" data-group="' + escapeHtml(group) + '">'
      + escapeHtml(group) + '</button>';
  }).join('');

  // Clicking a tab shows that group's cards
  tabs.addEventListener('click', function (event) {
    const button = event.target.closest('button');   // the tab that was clicked (even if the click hit its text)
    if (!button) { return; }
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b === button));
    showPackageGroup(button.dataset.group);
  });

  showPackageGroup(groups[0]);   // start with the first group
}

function showPackageGroup(group) {
  const cards = allPackages
    .filter((pack) => pack.category === group)          // only this group's packages
    .map(function (pack) {
      const seats = pack.guests_seated ? '<p class="package-seats">Up to ' + pack.guests_seated + ' guests seated</p>' : '';
      const lines = pack.includes.map((line) => '<li>' + escapeHtml(line) + '</li>').join('');
      return '<article class="package-card">'
        + '<h3>' + escapeHtml(pack.name) + '</h3>'
        + '<p class="package-price">' + kes(pack.price) + '</p>'
        + seats
        + '<ul>' + lines + '</ul>'
        + '</article>';
    });
  document.getElementById('packageGrid').innerHTML = cards.join('');
}


// ---------- 3. Price list ----------
function showPriceList(groups) {
  // Jump links: tapping "Seating" scrolls to the Seating table
  document.getElementById('categoryChips').innerHTML = groups.map(function (group) {
    return '<a class="chip" href="#cat-' + group.slug + '">' + escapeHtml(group.name) + '</a>';
  }).join('');

  // One block per category, one row per item
  document.getElementById('priceList').innerHTML = groups.map(function (group) {
    const rows = group.items.map(function (item) {
      const note = item.description ? '<span class="price-note">' + escapeHtml(item.description) + '</span>' : '';
      return '<li><span class="price-name">' + escapeHtml(item.name) + note + '</span>'
        + '<span class="price-amount">' + kes(item.unit_price) + '</span></li>';
    }).join('');
    return '<section class="price-group" id="cat-' + group.slug + '">'
      + '<h3>' + escapeHtml(group.name) + '</h3>'
      + '<ul class="price-rows">' + rows + '</ul>'
      + '</section>';
  }).join('');
}


loadPage();
