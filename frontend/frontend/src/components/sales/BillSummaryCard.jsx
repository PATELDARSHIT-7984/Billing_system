import { useEffect, useRef, useState } from 'react';
import { formatCurrency, formatSignedCurrency } from '../../utils/calculations';
import { amountInWords } from '../../utils/billCalculations';

export default function BillSummaryCard({ totals, isInterstate }) {
  const [pulse, setPulse] = useState(false);
  const prevTotal = useRef(totals.grandTotal);

  useEffect(() => {
    if (prevTotal.current !== totals.grandTotal) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 260);
      prevTotal.current = totals.grandTotal;
      return () => clearTimeout(t);
    }
  }, [totals.grandTotal]);

  return (
    <div className="purchase-summary">
      <div className="purchase-summary__row">
        <span>Subtotal (Taxable Amount)</span>
        <span>{formatCurrency(totals.taxableAmount)}</span>
      </div>

      {isInterstate ? (
        <div className="purchase-summary__row">
          <span>IGST Total</span>
          <span>{formatCurrency(totals.igstTotal)}</span>
        </div>
      ) : (
        <>
          <div className="purchase-summary__row">
            <span>CGST Total</span>
            <span>{formatCurrency(totals.cgstTotal)}</span>
          </div>
          <div className="purchase-summary__row">
            <span>SGST Total</span>
            <span>{formatCurrency(totals.sgstTotal)}</span>
          </div>
        </>
      )}

      <div className="purchase-summary__row">
        <span>GST Total</span>
        <span>{formatCurrency(totals.gstTotal)}</span>
      </div>

      <div className="purchase-summary__row purchase-summary__row--muted">
        <span>Round Off</span>
        <span>{formatSignedCurrency(totals.roundOff)}</span>
      </div>

      <div className={`purchase-summary__grand ${pulse ? 'purchase-summary__grand--pulse' : ''}`}>
        <span>Grand Total</span>
        <span>{formatCurrency(totals.grandTotal)}</span>
      </div>

      {totals.grandTotal > 0 && (
        <p className="bill-summary__words">{amountInWords(totals.grandTotal)}</p>
      )}
    </div>
  );
}
