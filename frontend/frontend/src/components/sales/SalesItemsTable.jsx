import { computeBillLineAmounts } from '../../utils/billCalculations';
import { formatCurrency } from '../../utils/calculations';

export default function SalesItemsTable({ items, isInterstate, onEdit, onDelete }) {
  return (
    <div className="purchase-items-table-wrap">
      <table className="purchase-items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item Name</th>
            <th>HSN</th>
            <th className="text-right">Qty</th>
            <th>Unit</th>
            <th className="text-right">Rate</th>
            <th className="text-right">GST %</th>
            <th className="text-right">Taxable</th>
            <th className="text-right">GST</th>
            <th className="text-right">Amount</th>
            <th className="purchase-items-table__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={11} className="purchase-items-table__empty">
                No items added yet. Use the form above to add the first item.
              </td>
            </tr>
          )}
          {items.map((item, index) => {
            const { taxable, cgst, sgst, igst, amount } = computeBillLineAmounts(item, isInterstate);
            const gstAmount = cgst + sgst + igst;
            return (
              <tr key={item._rowId} className="purchase-items-table__row-in">
                <td>{index + 1}</td>
                <td>{item.item_name}</td>
                <td>{item.hsn_code || '—'}</td>
                <td className="text-right">{item.quantity}</td>
                <td>{item.unit || '—'}</td>
                <td className="text-right">{formatCurrency(item.rate)}</td>
                <td className="text-right">{item.gst_rate || 0}%</td>
                <td className="text-right">{formatCurrency(taxable)}</td>
                <td className="text-right">{formatCurrency(gstAmount)}</td>
                <td className="text-right purchase-items-table__amount">{formatCurrency(amount)}</td>
                <td className="purchase-items-table__actions-col">
                  <div className="purchase-items-table__actions">
                    <button type="button" className="purchase-items-table__action-btn" onClick={() => onEdit(index)} title="Edit">
                      ✎
                    </button>
                    <button
                      type="button"
                      className="purchase-items-table__action-btn purchase-items-table__action-btn--delete"
                      onClick={() => onDelete(index)}
                      title="Remove"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
