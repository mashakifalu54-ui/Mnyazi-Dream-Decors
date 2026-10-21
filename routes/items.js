// routes/items.js: the web addresses (routes) that send the price list to the browser.
//
// A "route" = an address + what the server does when someone asks for it.
//   GET /api/items     -> the price list, grouped by category
//   GET /api/packages  -> the packages with what they include
//   GET /api/options   -> event types, budget ranges and the deposit % (for forms and the quote)
// The answer is JSON: data written in a way JavaScript in the browser can read directly.

const express = require('express');
const catalogue = require('../lib/catalogue');
const { getSetting } = require('../lib/settings');

// A Router is a small group of routes; server.js plugs it in under /api
const router = express.Router();

router.get('/items', function (request, response) {
  response.json(catalogue.getPriceList());
});

router.get('/packages', function (request, response) {
  response.json(catalogue.getPackages());
});

router.get('/options', function (request, response) {
  response.json({
    eventTypes: catalogue.getEventTypes(),
    budgetRanges: catalogue.getBudgetRanges(),
    depositPercent: Number(getSetting('deposit_percent') || 50)
  });
});

module.exports = router;
