// Mirrors bill_service.py's tax math exactly (_resolve_bill_items /
// create_bill), so the on-screen preview always matches what gets saved.
// Rate and gst_rate come from Item Master; the backend ignores any typed
// price (see billService.js / SalesEntry.jsx).

// ===================== Per-line tax split =====================
export function computeBillLineAmounts({ quantity, rate, gst_rate }, isInterstate) {
  const qty = Number(quantity) || 0;
  const price = Number(rate) || 0;
  const gstPercent = Number(gst_rate) || 0;

  const taxable = qty * price;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    igst = (taxable * gstPercent) / 100;
  } else {
    cgst = (taxable * (gstPercent / 2)) / 100;
    sgst = (taxable * (gstPercent / 2)) / 100;
  }

  return { taxable, cgst, sgst, igst, amount: taxable + cgst + sgst + igst };
}

// ===================== Invoice totals =====================
// Bill has no round_off column -- grand_total is just round(total, 2), so
// roundOff here is normally a near-zero paisa adjustment, not a whole-rupee
// round like Purchase Entry.
export function computeBillTotals(items, isInterstate) {
  const totals = items.reduce(
    (acc, item) => {
      const { taxable, cgst, sgst, igst } = computeBillLineAmounts(item, isInterstate);
      acc.taxableAmount += taxable;
      acc.cgstTotal += cgst;
      acc.sgstTotal += sgst;
      acc.igstTotal += igst;
      return acc;
    },
    { taxableAmount: 0, cgstTotal: 0, sgstTotal: 0, igstTotal: 0 }
  );

  const gstTotal = totals.cgstTotal + totals.sgstTotal + totals.igstTotal;
  const netTotal = totals.taxableAmount + gstTotal;
  const grandTotal = Math.round(netTotal * 100) / 100;
  const totalBoxes = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  return { ...totals, gstTotal, roundOff: grandTotal - netTotal, grandTotal, totalBoxes };
}

// ===================== Amount in words (Indian numbering) =====================
// Ported from bill_service.py's _amount_in_words() for the pre-save live
// preview. The saved invoice always shows the server's own value instead.
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n) {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (TENS[tens] + (ones ? ' ' + ONES[ones] : '')).trim();
}

function threeDigitWords(n) {
  if (n >= 100) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    return ONES[hundreds] + ' Hundred' + (rest ? ' ' + twoDigitWords(rest) : '');
  }
  return twoDigitWords(n);
}

function numberToWordsIndian(n) {
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts = [];
  if (crore) parts.push(threeDigitWords(crore) + ' Crore');
  if (lakh) parts.push(threeDigitWords(lakh) + ' Lakh');
  if (thousand) parts.push(threeDigitWords(thousand) + ' Thousand');
  if (hundred) parts.push(threeDigitWords(hundred));

  return parts.join(' ');
}

export function amountInWords(grandTotal) {
  const rupees = Math.floor(grandTotal);
  const paise = Math.round((grandTotal - rupees) * 100);

  let words = `${numberToWordsIndian(rupees)} Rupees`;
  if (paise) words += ` and ${numberToWordsIndian(paise)} Paise`;
  words += ' Only';
  return words;
}
