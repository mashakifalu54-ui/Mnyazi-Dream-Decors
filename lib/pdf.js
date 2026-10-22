// pdf.js: DRAWS a quote or invoice as an A4 PDF (layout from design-canvas/Invoice.dc.html).
//
// One job: drawing. The words and numbers come ready from lib/documents.js.
//   writeDocumentPdf(data, output, statusLink)
//   writeReceiptPdf(data, output, statusLink)   (data from getReceiptData)
//     data       = getDocumentData(...)
//     output     = where the PDF goes (the web response, or a file when testing)
//     statusLink = the customer's private page address, printed at the bottom
//
// PDFKit basics:
//   doc.text('words', x, y, { width, align })   writes text; x and y are points from the top-left
//   A4 = 595 x 842 points (1 point = 1/72 inch). We keep a 48-point margin all round.
//   doc.y = where the next line will go; it moves down by itself after each text().

const PDFDocument = require('pdfkit');
const path = require('node:path');

const NAVY = '#15224A';
const GOLD = '#C9A227';
const INK = '#141B33';
const MUTED = '#5A627A';
const LINE = '#DFDCD3';
const TINT = '#F2EFE7';

const LEFT = 48;
const RIGHT = 595 - 48;
const WIDTH = RIGHT - LEFT;
const BOTTOM = 842 - 60;   // lower than this, start a new page

// Table columns: # | Item | Qty | Unit price | Total
const COL = { n: LEFT + 8, item: LEFT + 30, qty: LEFT + 290, unit: LEFT + 330, total: LEFT + 420 };
const COL_WIDTH = { item: 250, qty: 34, unit: 84, total: WIDTH - 420 - 8 };

const money = (n) => n.toLocaleString('en-KE');   // 42500 -> '42,500'


function writeDocumentPdf(data, output, statusLink) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    info: { Title: data.title + ' ' + data.number, Author: data.business.name }   // shown in the PDF's properties
  });
  // Marcellus (the brand heading font) is kept in assets/fonts; the body uses Helvetica, built into every PDF
  doc.registerFont('Heading', path.join(__dirname, '..', 'assets', 'fonts', 'Marcellus-Regular.ttf'));
  doc.pipe(output);   // pipe = everything drawn flows into the output, piece by piece

  drawHeader(doc, data);
  drawParties(doc, data);
  drawTable(doc, data);
  drawTotals(doc, data);
  drawPaymentAndTerms(doc, data, statusLink);

  doc.end();   // finished: the output is closed
}


// ---------- Business name, document title and number ----------
function drawHeader(doc, data) {
  doc.rect(0, 0, 595, 8).fill(NAVY);   // thin navy band at the very top
  doc.rect(0, 8, 595, 2).fill(GOLD);

  doc.font('Heading').fontSize(24).fillColor(NAVY).text(data.business.name, LEFT, 40);
  doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
    .text(data.business.address, LEFT, 70)
    .text(data.business.phone + '  ·  WhatsApp ' + data.business.phone);

  // Right side: QUOTE / INVOICE, number and dates
  doc.font('Heading').fontSize(26).fillColor(GOLD).text(data.title, LEFT, 38, { width: WIDTH, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('No. ' + data.number, LEFT, 72, { width: WIDTH, align: 'right' });
  doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
    .text('Issued ' + data.issued + (data.validUntil ? '  ·  valid until ' + data.validUntil : ''), LEFT, 86, { width: WIDTH, align: 'right' });

  doc.moveTo(LEFT, 112).lineTo(RIGHT, 112).lineWidth(1).strokeColor(LINE).stroke();
}


// ---------- Client and event, side by side ----------
function drawParties(doc, data) {
  const top = 126;
  const half = WIDTH / 2;

  label(doc, 'CLIENT', LEFT, top);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(data.client.name, LEFT, top + 14, { width: half - 20 });
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(data.client.phone, { width: half - 20 });
  const leftEnd = doc.y;

  const e = data.event;
  label(doc, 'EVENT', LEFT + half, top);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK)
    .text(e.type + (e.guests ? ' · ' + e.guests + ' guests' : ''), LEFT + half, top + 14, { width: half });
  doc.font('Helvetica').fontSize(10).fillColor(MUTED)
    .text(e.date + (e.area ? ' · ' + e.area : ''), { width: half });
  if (e.notes) { doc.text('“' + e.notes + '”', { width: half }); }

  doc.y = Math.max(leftEnd, doc.y) + 18;   // carry on below whichever column is longer
}

function label(doc, words, x, y) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(words, x, y, { characterSpacing: 1 });
}


// ---------- The table of lines ----------
function drawTableHead(doc) {
  const y = doc.y;
  doc.rect(LEFT, y, WIDTH, 22).fill(TINT);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED);
  doc.text('#', COL.n, y + 7);
  doc.text('ITEM / DESCRIPTION', COL.item, y + 7);
  doc.text('QTY', COL.qty, y + 7, { width: COL_WIDTH.qty, align: 'right' });
  doc.text('UNIT PRICE', COL.unit, y + 7, { width: COL_WIDTH.unit, align: 'right' });
  doc.text('TOTAL (KES)', COL.total, y + 7, { width: COL_WIDTH.total, align: 'right' });
  doc.y = y + 28;
}

function drawTable(doc, data) {
  drawTableHead(doc);

  data.lines.forEach(function (line, i) {
    doc.font('Helvetica').fontSize(10);
    // How tall this row must be: the item name may wrap onto two lines
    const nameHeight = doc.heightOfString(line.name, { width: COL_WIDTH.item });
    const rowHeight = Math.max(nameHeight, 12) + 12;

    if (doc.y + rowHeight > BOTTOM) {   // no room left: new page, and repeat the table heading
      doc.addPage();
      doc.y = 48;
      drawTableHead(doc);
      doc.font('Helvetica').fontSize(10);   // the heading changed the font: set it back for the row
    }

    const y = doc.y;
    const muted = line.note ? MUTED : INK;
    doc.fillColor(MUTED).text(String(i + 1), COL.n, y);
    doc.fillColor(muted).text(line.name, COL.item, y, { width: COL_WIDTH.item });
    doc.fillColor(muted).text(String(line.qty), COL.qty, y, { width: COL_WIDTH.qty, align: 'right' });
    doc.text(line.unitPrice == null ? '—' : money(line.unitPrice), COL.unit, y, { width: COL_WIDTH.unit, align: 'right' });
    if (line.note) {
      doc.font('Helvetica-Oblique').fillColor('#7A5F12').text(line.note, COL.total, y, { width: COL_WIDTH.total, align: 'right' });
    } else {
      doc.font('Helvetica-Bold').fillColor(INK).text(money(line.total), COL.total, y, { width: COL_WIDTH.total, align: 'right' });
    }

    doc.moveTo(LEFT, y + rowHeight - 6).lineTo(RIGHT, y + rowHeight - 6).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.y = y + rowHeight;
  });
}


// ---------- Totals (right side) ----------
function drawTotals(doc, data) {
  const t = data.totals;
  const x = LEFT + WIDTH - 230;
  const w = 230;
  if (doc.y + 140 > BOTTOM) { doc.addPage(); doc.y = 48; }
  let y = doc.y + 8;

  function row(words, amount, options) {
    options = options || {};
    doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.size || 10).fillColor(options.color || INK);
    doc.text(words, x, y, { width: w - 100 });
    doc.text(amount, x + w - 100, y, { width: 100, align: 'right' });
    y += (options.size || 10) + 8;
  }

  row('Subtotal', money(t.subtotal));
  row('Transport', t.transport ? money(t.transport) : (data.type === 'quote' ? 'to confirm' : '0'), { color: t.transport ? INK : MUTED });
  if (t.discount) { row('Discount', '– ' + money(t.discount)); }   // en dash: the built-in PDF font has no minus sign

  doc.moveTo(x, y).lineTo(x + w, y).lineWidth(1.5).strokeColor(INK).stroke();
  y += 8;
  row('Total', 'KES ' + money(t.total), { bold: true, size: 13 });
  row('Deposit due (' + t.depositPercent + '%)', 'KES ' + money(t.deposit), { bold: true, color: '#7A5F12' });
  row('Balance', 'KES ' + money(t.balance), { color: MUTED });

  if (t.pendingCount) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED)
      .text(t.pendingCount + ' item(s) still have a price pending. The total will change when the office adds the price.', LEFT, y + 4, { width: WIDTH });
    y = doc.y;
  }
  doc.y = y + 12;
}


// ---------- How to pay, terms, thank you ----------
function drawPaymentAndTerms(doc, data, statusLink) {
  if (doc.y + 150 > BOTTOM) { doc.addPage(); doc.y = 48; }
  const top = doc.y;
  const boxHeight = 30 + 14 * data.terms.length + 22;
  doc.roundedRect(LEFT, top, WIDTH, boxHeight, 8).fill(TINT);

  label(doc, 'HOW TO PAY', LEFT + 16, top + 14);
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(data.payment, LEFT + 16, top + 28, { width: WIDTH / 2 - 32 });

  label(doc, 'TERMS', LEFT + WIDTH / 2, top + 14);
  doc.font('Helvetica').fontSize(9.5).fillColor(INK);
  let y = top + 28;
  data.terms.forEach(function (term) {
    doc.text('• ' + term, LEFT + WIDTH / 2, y, { width: WIDTH / 2 - 16 });
    y = doc.y + 2;
  });

  doc.y = top + Math.max(boxHeight, y - top + 10) + 22;
  doc.font('Heading').fontSize(13).fillColor(NAVY).text('Thank you for choosing ' + data.business.name + '.', LEFT, doc.y, { width: WIDTH, align: 'center' });
  if (statusLink) {
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
      .text('See your booking online: ' + statusLink, LEFT, doc.y, { width: WIDTH, align: 'center', link: statusLink });
  }
}


// ---------- Receipt: one payment ----------
function writeReceiptPdf(data, output, statusLink) {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'Receipt ' + data.number, Author: data.business.name } });
  doc.registerFont('Heading', path.join(__dirname, '..', 'assets', 'fonts', 'Marcellus-Regular.ttf'));
  doc.pipe(output);

  drawHeader(doc, data);
  drawParties(doc, data);
  const r = data.receipt;

  // The amount received, big, in a tinted box
  const top = doc.y;
  doc.roundedRect(LEFT, top, WIDTH, 86, 8).fill(TINT);
  label(doc, 'RECEIVED WITH THANKS', LEFT + 18, top + 16);
  doc.font('Helvetica-Bold').fontSize(28).fillColor(NAVY).text('KES ' + money(r.amount), LEFT + 18, top + 32);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED)
    .text(r.method + (r.code ? ' · code ' + r.code : ''), LEFT + WIDTH / 2, top + 30, { width: WIDTH / 2 - 18, align: 'right' })
    .text('For booking ' + r.bookingNo, LEFT + WIDTH / 2, top + 46, { width: WIDTH / 2 - 18, align: 'right' });
  doc.y = top + 106;

  // Where the booking stands after this payment
  const x = LEFT + WIDTH - 260;
  let y = doc.y;
  [['Booking total', 'KES ' + money(r.bookingTotal), INK, 'Helvetica'],
   ['Paid so far (with this payment)', 'KES ' + money(r.paidSoFar), INK, 'Helvetica'],
   ['Balance left', 'KES ' + money(r.balanceLeft), r.balanceLeft ? '#7A5F12' : '#135C34', 'Helvetica-Bold']
  ].forEach(function (row) {
    doc.font(row[3]).fontSize(11).fillColor(row[2]);
    doc.text(row[0], x, y, { width: 160 });
    doc.text(row[1], x + 160, y, { width: 100, align: 'right' });
    y += 20;
  });
  doc.moveTo(x, y + 2).lineTo(RIGHT, y + 2).lineWidth(1).strokeColor(LINE).stroke();

  doc.y = y + 30;
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(
    r.balanceLeft ? 'Your date is held. Please pay the balance of KES ' + money(r.balanceLeft) + ' before the event.' : 'Your booking is fully paid. Thank you!',
    LEFT, doc.y, { width: WIDTH, align: 'center' });
  doc.moveDown(1.2);
  doc.font('Heading').fontSize(13).fillColor(NAVY).text('Thank you for choosing ' + data.business.name + '.', { width: WIDTH, align: 'center' });
  if (statusLink) {
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text('See your booking online: ' + statusLink, { width: WIDTH, align: 'center', link: statusLink });
  }
  doc.end();
}

module.exports = { writeDocumentPdf, writeReceiptPdf };
