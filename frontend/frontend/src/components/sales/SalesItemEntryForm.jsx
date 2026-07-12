import { useMemo } from 'react';
import SearchableSelect from '../common/SearchableSelect';
import { FormInput } from '../common/FormField';
import Button from '../common/Button';
import { computeBillLineAmounts } from '../../utils/billCalculations';
import { formatCurrency } from '../../utils/calculations';

export default function SalesItemEntryForm({
  form,
  onFieldChange,
  onItemSelect,
  itemOptions,
  isEditing,
  isInterstate,
  onAdd,
  onClear,
  errors,
}) {
  const liveAmount = useMemo(() => computeBillLineAmounts(form, isInterstate).amount, [form, isInterstate]);

  return (
    <div className="item-entry-form">
      <div className="item-entry-form__grid">
        <SearchableSelect
          label="Item Name"
          name="item_id"
          placeholder="Search item by name..."
          options={itemOptions}
          value={form.item_id}
          onChange={onItemSelect}
          required
          error={errors.item_id}
          emptyMessage="No items found. Add items in Item Master first."
        />
        <FormInput label="HSN Code" name="hsn_code" value={form.hsn_code} onChange={() => {}} disabled />
        <FormInput label="Unit" name="unit" value={form.unit} onChange={() => {}} disabled />
        <FormInput
          label="Current Stock"
          name="current_stock"
          value={form.item_id ? form.current_stock : ''}
          onChange={() => {}}
          disabled
        />
      </div>

      <div className="item-entry-form__grid item-entry-form__grid--numbers">
        <FormInput
          label="Quantity"
          name="quantity"
          type="number"
          value={form.quantity}
          onChange={(v) => onFieldChange('quantity', v)}
          required
          error={errors.quantity}
        />
        <FormInput
          label="Sale Price"
          name="rate"
          type="number"
          value={form.rate}
          onChange={(v) => onFieldChange('rate', v)}
          required
          error={errors.rate}
        />
        <FormInput label="GST %" name="gst_rate" value={form.item_id ? `${form.gst_rate}%` : ''} onChange={() => {}} disabled />
        <div className="item-entry-form__amount">
          <span className="item-entry-form__amount-label">Amount</span>
          <span className="item-entry-form__amount-value">{formatCurrency(liveAmount)}</span>
        </div>
      </div>

      {form.item_id && (
        <p className="sales-item-entry__price-note">
          Note: the bill is always charged at Item Master&apos;s current sale price. Editing Sale Price here only
          updates this on-screen preview — it is not sent when you save.
        </p>
      )}

      <div className="item-entry-form__actions">
        <Button variant="secondary" onClick={onClear}>
          Clear
        </Button>
        <Button variant="primary" onClick={onAdd}>
          {isEditing ? 'Update Item' : 'Add Item'}
        </Button>
      </div>
    </div>
  );
}
