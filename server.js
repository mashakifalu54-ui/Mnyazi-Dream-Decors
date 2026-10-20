// server.js: starts the website.
//
// Run it with:  npm start      then open http://localhost:3000 in a browser
// Stop it with: Ctrl + C in the terminal
//
// What it does:
//   1. sends the files in public/ (HTML, CSS, JavaScript, photos) to the browser
//   2. answers the /api/... addresses with data from the database (routes/items.js)

const express = require('express');
const path = require('node:path');
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

app.listen(PORT, function () {
  console.log('Mnyazi Dream Decor is running at http://localhost:' + PORT);
  console.log('Press Ctrl + C to stop.');
});
