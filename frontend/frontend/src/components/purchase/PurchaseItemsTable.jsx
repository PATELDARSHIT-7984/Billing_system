import { computeLineAmounts, formatCurrency } from '../../utils/calculations';

export default function PurchaseItemsTable({ items, onEdit, onDelete }) {
  return (
    <div className="purchase-items-table-wrap">
      <table className="purchase-items-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>HSN</th>
            <th className="text-right">Qty</th>
            <th>Unit</th>
            <th className="text-right">Price</th>
            <th className="text-right">Disc %</th>
            <th className="text-right">SGST %</th>
            <th className="text-right">CGST %</th>
            <th className="text-right">IGST %</th>
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
            const { amount } = computeLineAmounts(item);
            return (
              <tr key={item._rowId} className="purchase-items-table__row-in">
                <td>{item.item_name}</td>
                <td>{item.hsn_code || '—'}</td>
                <td className="text-right">{item.quantity}</td>
                <td>{item.unit || '—'}</td>
                <td className="text-right">{formatCurrency(item.price)}</td>
                <td className="text-right">{item.disc_percent || 0}%</td>
                <td className="text-right">{item.sgst || 0}%</td>
                <td className="text-right">{item.cgst || 0}%</td>
                <td className="text-right">{item.igst || 0}%</td>
                <td className="text-right purchase-items-table__amount">{formatCurrency(amount)}</td>
                <td className="purchase-items-table__actions-col">
                  <div className="purchase-items-table__actions">
                    <button type="button" className="purchase-items-table__action-btn" onClick={() => onEdit(index)} title="Edit">
                      ✎
                    </button>
                    <button type="button" className="purchase-items-table__action-btn purchase-items-table__action-btn--delete" onClick={() => onDelete(index)} title="Remove">
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
