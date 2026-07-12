import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { formatCurrency, formatSignedCurrency } from '../utils/calculations';
import './PurchaseDetailModal.css';

export default function PurchaseDetailModal({ open, loading, purchase, onClose }) {
  return (
    <Modal
      open={open}
      title={purchase ? `Bill #${purchase.bill_no}` : 'Purchase Details'}
      onClose={onClose}
      width={820}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading && <div className="purchase-detail__loading">Loading purchase...</div>}

      {!loading && purchase && (
        <div className="purchase-detail">
          <div className="purchase-detail__meta">
            <div>
              <span className="purchase-detail__meta-label">Supplier</span>
              <span className="purchase-detail__meta-value">{purchase.party_name || '—'}</span>
            </div>
            <div>
              <span className="purchase-detail__meta-label">Bill Date</span>
              <span className="purchase-detail__meta-value">
                {new Date(purchase.bill_date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            {purchase.order_no && (
              <div>
                <span className="purchase-detail__meta-label">Order No.</span>
                <span className="purchase-detail__meta-value">{purchase.order_no}</span>
              </div>
            )}
          </div>

          <div className="purchase-detail__table-wrap">
            <table className="purchase-detail__table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>HSN</th>
                  <th className="align-right">Qty</th>
                  <th>Unit</th>
                  <th className="align-right">Price</th>
                  <th className="align-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="purchase-detail__empty">
                      No items on this bill.
                    </td>
                  </tr>
                )}
                {purchase.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item_name}</td>
                    <td>{item.hsn_code || '—'}</td>
                    <td className="align-right">{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td className="align-right">{formatCurrency(item.price)}</td>
                    <td className="align-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="purchase-detail__summary">
            <div className="purchase-detail__summary-row">
              <span>Taxable Amount</span>
              <span>{formatCurrency(purchase.taxable_amount)}</span>
            </div>
            <div className="purchase-detail__summary-row">
              <span>SGST Total</span>
              <span>{formatCurrency(purchase.sgst_total)}</span>
            </div>
            <div className="purchase-detail__summary-row">
              <span>CGST Total</span>
              <span>{formatCurrency(purchase.cgst_total)}</span>
            </div>
            <div className="purchase-detail__summary-row">
              <span>IGST Total</span>
              <span>{formatCurrency(purchase.igst_total)}</span>
            </div>
            <div className="purchase-detail__summary-row purchase-detail__summary-row--muted">
              <span>Round Off</span>
              <span>{formatSignedCurrency(purchase.round_off)}</span>
            </div>
            <div className="purchase-detail__grand">
              <span>Grand Total</span>
              <span>{formatCurrency(purchase.grand_total)}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
