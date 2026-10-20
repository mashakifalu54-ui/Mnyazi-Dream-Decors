/*
  common.js: small things EVERY page needs. Load it on every page, before the page's own script.
  1. Phone menu (open / close)
  2. Footer year
  3. kes(): writes a number as Kenyan money, e.g. 3000 -> "KES 3,000"
*/

// ---------- 1. Phone menu ----------
const menuBtn = document.getElementById('menuBtn');
const mainNav = document.getElementById('mainNav');

menuBtn.addEventListener('click', function () {
  // toggle() adds the class if it is missing, removes it if it is there.
  // It returns true when the class is now ON (menu open).
  const isOpen = mainNav.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', isOpen);   // tells screen readers if the menu is open
});

// Close the menu after a link is tapped (otherwise it covers the page)
mainNav.addEventListener('click', function (event) {
  if (event.target.tagName === 'A') {
    mainNav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
});


// ---------- 2. Footer year ----------
document.getElementById('year').textContent = new Date().getFullYear();


// ---------- 3. Money format ----------
// 'en-KE' = Kenyan English style: commas between thousands
function kes(amount) {
  return 'KES ' + amount.toLocaleString('en-KE');
}
