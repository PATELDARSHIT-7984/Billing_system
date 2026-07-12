import { jsPDF } from 'jspdf';
import { DEFAULT_COMPANY_PROFILE } from '../services/companyService';

// ---- App design tokens, translated to RGB for jsPDF (mirrors variables.css) ----
const COLOR_PRIMARY = [22, 87, 214]; // --color-primary
const COLOR_NAVY = [11, 36, 71]; // --color-sidebar-bg
const COLOR_TEXT = [27, 36, 55]; // --color-text-primary
const COLOR_MUTED = [89, 98, 122]; // --color-text-secondary
const COLOR_BORDER = [210, 217, 230];
const COLOR_HEADER_BG = [232, 240, 254]; // --color-primary-light

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 12;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatINR(value) {
  const num = Number(value) || 0;
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * billDetail: { bill: BillResponse, items: BillItemResponse[] }
 * company: CompanyProfileResponse from /company-profile (see CompanyContext)
 */
export function generateInvoicePDF(billDetail, company = DEFAULT_COMPANY_PROFILE) {
  const { bill, items } = billDetail;
  const isInterstate = (bill.igst_amount || 0) > 0;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  // ---------------- HEADER: Company + Invoice meta ----------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(...COLOR_NAVY);
  doc.text(company.company_name, MARGIN, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(company.address_line1 || '', MARGIN, y + 12);
  doc.text(company.address_line2 || '', MARGIN, y + 16.5);
  if (company.udyam_no) {
    doc.text(company.udyam_no, MARGIN, y + 21);
  }

  // Right-aligned invoice meta box
  const metaX = PAGE_WIDTH - MARGIN;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('SALES INVOICE', metaX, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(`Invoice No.: ${bill.invoice_no}`, metaX, y + 12, { align: 'right' });
  doc.text(`Bill Date: ${formatDate(bill.bill_date)}`, metaX, y + 17, { align: 'right' });
  doc.setTextColor(...COLOR_MUTED);
  doc.setFontSize(8);
  doc.text(isInterstate ? 'Supply Type: Interstate (IGST)' : 'Supply Type: Intrastate (CGST + SGST)', metaX, y + 22, { align: 'right' });

  y += 27;
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  // ---------------- BILL TO block ----------------
  const billToBoxHeight = 24;
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.2);
  doc.setFillColor(...COLOR_HEADER_BG);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('BILL TO', MARGIN + 3, y + 4.2);
  doc.rect(MARGIN, y, CONTENT_WIDTH, billToBoxHeight);
  doc.line(MARGIN, y + 6, PAGE_WIDTH - MARGIN, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(`M/s. ${bill.customer_name}`, MARGIN + 3, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`${bill.address}, ${bill.city}, ${bill.state}${bill.pincode ? ' - ' + bill.pincode : ''}`, MARGIN + 3, y + 17);
  const contactLine = `Contact: ${bill.mobile}${bill.buyer_gstin ? `      GSTIN: ${bill.buyer_gstin}` : ''}${bill.buyer_pan ? `      PAN: ${bill.buyer_pan}` : ''}`;
  doc.text(contactLine, MARGIN + 3, y + 22);

  y += billToBoxHeight + 6;

  // ---------------- ITEMS TABLE ----------------
  const columns = [
    { key: 'sn', label: 'S.N.', x: MARGIN, width: 10, align: 'left' },
    { key: 'name', label: 'DESCRIPTION', x: MARGIN + 10, width: 62, align: 'left' },
    { key: 'hsn', label: 'HSN/SAC', x: MARGIN + 72, width: 20, align: 'center' },
    { key: 'qty', label: 'QTY', x: MARGIN + 92, width: 14, align: 'right' },
    { key: 'unit', label: 'UNIT', x: MARGIN + 106, width: 14, align: 'center' },
    { key: 'rate', label: 'RATE', x: MARGIN + 120, width: 22, align: 'right' },
    { key: 'gst', label: 'GST %', x: MARGIN + 142, width: 14, align: 'right' },
    { key: 'amount', label: 'AMOUNT', x: MARGIN + 156, width: 30, align: 'right' },
  ];

  const rowHeight = 7;
  const headerHeight = 8;

  function drawTableHeader(yPos) {
    doc.setFillColor(...COLOR_HEADER_BG);
    doc.rect(MARGIN, yPos, CONTENT_WIDTH, headerHeight, 'F');
    doc.setDrawColor(...COLOR_BORDER);
    doc.rect(MARGIN, yPos, CONTENT_WIDTH, headerHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_PRIMARY);
    columns.forEach((col) => {
      const textX = col.align === 'right' ? col.x + col.width - 2 : col.align === 'center' ? col.x + col.width / 2 : col.x + 2;
      doc.text(col.label, textX, yPos + 5.3, { align: col.align === 'left' ? 'left' : col.align });
    });
    return yPos + headerHeight;
  }

  y = drawTableHeader(y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_TEXT);

  items.forEach((item, index) => {
    // New page if we run out of room (leaves space for totals section)
    if (y + rowHeight > PAGE_HEIGHT - 90) {
      doc.addPage();
      y = MARGIN;
      y = drawTableHeader(y);
    }

    doc.setDrawColor(...COLOR_BORDER);
    doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight);

    const cells = {
      sn: String(index + 1),
      name: item.item_name,
      hsn: item.hsn_code || '—',
      qty: String(item.quantity),
      unit: item.unit || '—',
      rate: formatINR(item.rate),
      gst: `${item.gst_percent}%`,
      amount: formatINR(item.line_total),
    };

    columns.forEach((col) => {
      const textX = col.align === 'right' ? col.x + col.width - 2 : col.align === 'center' ? col.x + col.width / 2 : col.x + 2;
      let text = cells[col.key];
      if (col.key === 'name' && doc.getTextWidth(text) > col.width - 4) {
        text = doc.splitTextToSize(text, col.width - 4)[0];
      }
      doc.text(text, textX, y + rowHeight - 2.3, { align: col.align === 'left' ? 'left' : col.align });
    });

    y += rowHeight;
  });

  // Close the table with a bottom border
  doc.setDrawColor(...COLOR_BORDER);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  // ---------------- TERMS (left) + TOTALS (right) ----------------
  const leftWidth = 100;
  const rightX = MARGIN + leftWidth + 6;
  const rightWidth = CONTENT_WIDTH - leftWidth - 6;
  const sectionTop = y;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('TERMS & CONDITIONS', MARGIN, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  let termsY = y + 7.5;
  (company.terms_and_conditions || []).forEach((line, i) => {
    const wrapped = doc.splitTextToSize(`${i + 1}. ${line}`, leftWidth);
    doc.text(wrapped, MARGIN, termsY);
    termsY += wrapped.length * 3.6;
  });

  if (bill.remarks) {
    termsY += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXT);
    doc.text('Remarks:', MARGIN, termsY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_MUTED);
    const remarkLines = doc.splitTextToSize(bill.remarks, leftWidth);
    doc.text(remarkLines, MARGIN, termsY + 4);
    termsY += 4 + remarkLines.length * 3.6;
  }

  // Totals box
  const totalsRows = isInterstate
    ? [['Taxable Amount', bill.taxable_amount], ['IGST', bill.igst_amount]]
    : [['Taxable Amount', bill.taxable_amount], ['CGST', bill.cgst_amount], ['SGST', bill.sgst_amount]];

  const totalsBoxHeight = (totalsRows.length + 1) * 6.5 + 6;
  doc.setDrawColor(...COLOR_BORDER);
  doc.rect(rightX, sectionTop, rightWidth, totalsBoxHeight);

  let totalsY = sectionTop + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  totalsRows.forEach(([label, value]) => {
    doc.setTextColor(...COLOR_MUTED);
    doc.text(label, rightX + 3, totalsY);
    doc.setTextColor(...COLOR_TEXT);
    doc.text(formatINR(value), rightX + rightWidth - 3, totalsY, { align: 'right' });
    totalsY += 6.5;
  });

  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.4);
  doc.line(rightX + 2, totalsY - 3.5, rightX + rightWidth - 2, totalsY - 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('NET AMOUNT', rightX + 3, totalsY + 2.5);
  doc.text(formatINR(bill.grand_total), rightX + rightWidth - 3, totalsY + 2.5, { align: 'right' });

  y = Math.max(termsY, sectionTop + totalsBoxHeight) + 6;

  // Amount in words (already computed server-side by bill_service.py)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(`Amount in Words: ${bill.amount_in_words}`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  y += 10;

  // ---------------- SELLER / BUYER / SIGNATURE ----------------
  doc.setDrawColor(...COLOR_BORDER);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("SELLER'S DETAILS", MARGIN, y);
  doc.text("BUYER'S DETAILS", MARGIN + 70, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  let sellerY = y + 5;
  if (company.gstin) { doc.text(`GSTIN: ${company.gstin}`, MARGIN, sellerY); sellerY += 4.5; }
  if (company.pan_card) { doc.text(`PAN: ${company.pan_card}`, MARGIN, sellerY); sellerY += 4.5; }

  let buyerY = y + 5;
  if (bill.buyer_gstin) { doc.text(`GSTIN: ${bill.buyer_gstin}`, MARGIN + 70, buyerY); buyerY += 4.5; }
  if (bill.buyer_pan) { doc.text(`PAN: ${bill.buyer_pan}`, MARGIN + 70, buyerY); buyerY += 4.5; }

  // Signature block (right side)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(`For, ${company.company_name}`, PAGE_WIDTH - MARGIN, y + 3, { align: 'right' });
  doc.setDrawColor(...COLOR_MUTED);
  doc.line(PAGE_WIDTH - MARGIN - 40, y + 20, PAGE_WIDTH - MARGIN, y + 20);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Owner Signature', PAGE_WIDTH - MARGIN, y + 24, { align: 'right' });

  y += Math.max(sellerY - y, buyerY - y, 24) + 4;

  // For short invoices (few items), anchor the footer near the bottom of
  // the page rather than leaving a large empty gap right after the
  // signature block — keeps the printed page looking balanced regardless
  // of item count.
  const bankAnchorY = PAGE_HEIGHT - 24;
  if (y < bankAnchorY) y = bankAnchorY;

  // Bank details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXT);
  doc.text("Company's Bank Details:", MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    `A/C Name: ${company.bank_account_name || '—'}   A/C No.: ${company.bank_account_no || '—'}   IFSC: ${company.bank_ifsc || '—'}   Bank: ${company.bank_name || '—'}`,
    MARGIN,
    y + 4
  );
  y += 10;

  const jurisdictionAnchorY = PAGE_HEIGHT - 14;
  if (y < jurisdictionAnchorY) y = jurisdictionAnchorY;

  // ---------------- JURISDICTION FOOTER ----------------
  doc.setDrawColor(...COLOR_BORDER);
  doc.setFillColor(...COLOR_HEADER_BG);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(company.jurisdiction_note || '', PAGE_WIDTH / 2, y + 4.7, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(billDetail, company = DEFAULT_COMPANY_PROFILE) {
  const doc = generateInvoicePDF(billDetail, company);
  doc.save(`Invoice_${billDetail.bill.invoice_no}.pdf`);
}
