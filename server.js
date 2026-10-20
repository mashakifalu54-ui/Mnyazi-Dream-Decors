// server.js: starts the website.
//
// Run it with:  npm start      then open http://localhost:3000 in a browser
// Stop it with: Ctrl + C in the terminal
//
// What it does:
//   0. checks the database is there and up to date (builds it the first time)
//   1. sends the files in public/ (HTML, CSS, JavaScript, photos) to the browser
//   2. answers the /api/... addresses with data from the database (routes/items.js)

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { DB_FILE, openDatabase } = require('./db/connection');


// ---------- 0. Database check (runs BEFORE anything reads the database) ----------
// First time: there is no database file yet, so build it with db/setup.js.
if (!fs.existsSync(DB_FILE)) {
  console.log('No database yet: building it now...');
  // execFileSync runs "node db/setup.js" and waits until it has finished
  execFileSync(process.execPath, [path.join(__dirname, 'db', 'setup.js')], { stdio: 'inherit' });
}

// Old database from an earlier build step: the tables changed, so stop with a clear message.
// (We never delete it automatically: one day it will hold real bookings.)
const check = openDatabase();
const hasNewTables = check.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'package_includes'").get();
check.close();
if (!hasNewTables) {
  console.error('Your database was made by an older version of the project.');
  console.error('Rebuild it with:  npm run db:reset   then run  npm start  again.');
  process.exit(1);
}


// ---------- Start the web server ----------
const express = require('express');
const itemRoutes = require('./routes/items');

const app = express();     // "app" is our web server
const PORT = process.env.PORT || 3000;   // a host can choose the port; on your computer it is 3000

// 1. Files in public/ are served as they are: public/prices.html -> http://localhost:3000/prices.html
app.use(express.static(path.join(__dirname, 'public')));

// 2. Every route in routes/items.js starts with /api  (so '/items' becomes '/api/items')
app.use('/api', itemRoutes);

// Anything else: a plain "not found" page
app.use(function (request, response) {
  response.status(404).send('Page not found');
});

const server = app.listen(PORT, function (error) {
  if (error) { return; }   // Express 5 also calls this when starting fails; the 'error' handler below explains why
  console.log('Mnyazi Dream Decor is running at http://localhost:' + PORT);
  console.log('Press Ctrl + C to stop.');
});

// Common problem: the server is already running in another terminal (port 3000 is taken)
server.on('error', function (error) {
  if (error.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is already in use: the server is probably already running in another terminal.');
    console.error('Open http://localhost:' + PORT + ' in your browser, or stop the other one with Ctrl + C first.');
  } else {
    console.error(error);
  }
  process.exit(1);
});
