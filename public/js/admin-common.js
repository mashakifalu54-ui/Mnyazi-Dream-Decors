/*
  admin-common.js: things BOTH admin pages need. Load it after common.js.
  1. api(): talk to the server, and show the login box when the session has ended
  2. The login box and the Log out button
  3. Status chips: the coloured labels (New, Custom item, Waiting deposit ...)
  4. Dates: '2026-12-12' -> 'Sat 12 Dec 2026'
*/

// ---------- 1. Talking to the server ----------
// api('/api/admin/bookings')                     -> GET
// api('/api/admin/bookings/3', { lines: [...] }) -> POST with that data
// Gives back the answer as an object, or throws an Error with the server's plain-words message.
async function api(address, sendData) {
  const options = sendData === undefined ? {} : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sendData)
  };
  const answer = await fetch(address, options);
  const data = await answer.json();
  if (answer.status === 401 && !address.endsWith('/login')) {   // logged out (or the server restarted): ask again
    showLogin();
    throw new Error(data.error);
  }
  if (!answer.ok) { throw new Error(data.error || 'Something went wrong.'); }
  return data;
}


// ---------- 2. Log in / log out ----------
// Every admin page has <div id="adminApp"> (the real page) and <section id="loginBox"> (hidden).
// The page calls startAdminPage(load): if logged in, load() runs; if not, the login box shows first.
let pageLoader = null;

async function startAdminPage(load) {
  pageLoader = load;
  const me = await api('/api/admin/me');
  if (me.loggedIn) { showApp(); load(); } else { showLogin(me.passwordSet); }
}

function showApp() {
  document.getElementById('loginBox').hidden = true;
  document.getElementById('adminApp').hidden = false;
}

function showLogin(passwordSet) {
  document.getElementById('adminApp').hidden = true;
  document.getElementById('loginBox').hidden = false;
  if (passwordSet === false) {
    document.getElementById('loginError').textContent = 'No admin password yet. In the terminal run: npm run admin:password, then restart the server.';
    document.getElementById('loginError').hidden = false;
  }
  document.getElementById('loginPassword').focus();
}

document.getElementById('loginForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  const error = document.getElementById('loginError');
  error.hidden = true;
  try {
    await api('/api/admin/login', { password: document.getElementById('loginPassword').value });
    document.getElementById('loginPassword').value = '';   // don't leave the password in the box
    showApp();
    if (pageLoader) { pageLoader(); }
  } catch (problem) {
    error.textContent = problem.message;
    error.hidden = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async function () {
  await api('/api/admin/logout', {});
  showLogin();
});


// ---------- 3. Status chips ----------
const STATUS_LABELS = {
  new: 'New',
  needs_price: 'Custom item',
  quoted: 'Waiting deposit',
  deposit_paid: 'Deposit paid',
  fully_paid: 'Paid in full',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled'
};

function statusChip(status) {
  return '<span class="status-chip status-' + status + '">' + (STATUS_LABELS[status] || status) + '</span>';
}


// ---------- 4. Dates ----------
function shortDate(dateText) {
  const date = new Date(dateText.slice(0, 10) + 'T12:00:00');
  return date.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
