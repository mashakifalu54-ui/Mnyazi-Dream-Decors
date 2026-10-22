/*
  kenya-phone.js: checks and tidies a Kenyan mobile number.
  Used by BOTH the booking form in the browser and the server (like quote-math.js),
  so the rule is written only once.

  Accepted (DESIGN-PROMPT.md): 07xx xxx xxx, 01xx xxx xxx, +254 7xx ..., 254 1xx ...
  Spaces and dashes are ignored.

  normalizeKenyanPhone('0712 345 678')   -> '254712345678'   (the form we save; M-Pesa uses it too)
  normalizeKenyanPhone('+254 112 345 678') -> '254112345678'
  normalizeKenyanPhone('12345')          -> null              (not a Kenyan mobile number)

  prettyKenyanPhone('254712345678')      -> '0712 345 678'    (for showing on screen)
*/
function normalizeKenyanPhone(text) {
  const digits = String(text || '').replace(/[\s\-()]/g, '');   // remove spaces, dashes and brackets
  // ^ = start, $ = end. (?:\+?254|0) = "+254", "254" or "0", then 7 or 1, then 8 more digits.
  const match = digits.match(/^(?:\+?254|0)([71]\d{8})$/);
  return match ? '254' + match[1] : null;
}

function prettyKenyanPhone(saved) {
  const rest = String(saved).replace(/^254/, '');                  // '712345678'
  return '0' + rest.slice(0, 3) + ' ' + rest.slice(3, 6) + ' ' + rest.slice(6);
}

if (typeof module !== 'undefined') {
  module.exports = { normalizeKenyanPhone, prettyKenyanPhone };
}
