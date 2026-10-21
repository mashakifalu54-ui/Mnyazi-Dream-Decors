// routes/quote.js: the web address that prices a quote.
//
//   POST /api/quote   the browser sends what the customer picked; the server answers with the priced quote
//
// POST (not GET) because the browser SENDS data in the "body" of the request.
// No SQL here (CLAUDE.md): the work is done in lib/quote.js.

const express = require('express');
const { buildQuote } = require('../lib/quote');

const router = express.Router();

router.post('/quote', function (request, response) {
  const result = buildQuote(request.body);
  if (result.error) {
    // 400 = "your request has a problem"; the message is in plain words for the page to show
    return response.status(400).json({ error: result.error });
  }
  response.json(result.quote);
});

module.exports = router;
