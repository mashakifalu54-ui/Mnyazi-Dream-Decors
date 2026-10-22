// set-admin-password.js: sets (or changes) the password for the office admin page.
//
// Run it with:   npm run admin:password
// It asks for the password, scrambles it (see lib/auth.js) and saves ONLY the scrambled
// version in the .env file as ADMIN_PASSWORD_HASH. .env is never sent to GitHub (.gitignore).
// Restart the server afterwards (Ctrl + C, then npm start).

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { hashPassword } = require('../lib/auth');

const ENV_FILE = path.join(__dirname, '..', '.env');

// readline lets us ask a question in the terminal and wait for the answer
const ask = readline.createInterface({ input: process.stdin, output: process.stdout });

ask.question('New admin password (at least 10 characters): ', function (password) {
  ask.close();
  password = password.trim();
  if (password.length < 10) {
    console.log('Too short: use at least 10 characters (a short sentence is easy to remember). Nothing changed.');
    process.exit(1);
  }

  // Keep every other line of .env (M-Pesa keys later), replace only our line
  const old = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  const kept = old.split(/\r?\n/).filter((line) => line && !line.startsWith('ADMIN_PASSWORD_HASH='));
  kept.push('ADMIN_PASSWORD_HASH=' + hashPassword(password));
  fs.writeFileSync(ENV_FILE, kept.join('\n') + '\n');

  console.log('Saved in .env. Restart the server (Ctrl + C, then npm start) and log in at http://localhost:3000/admin/');
  console.log('Tip: clear this terminal (cls) so the password is not left on the screen.');
});
