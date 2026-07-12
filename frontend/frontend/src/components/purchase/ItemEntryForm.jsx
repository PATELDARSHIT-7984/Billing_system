import { useMemo } from 'react';
import SearchableSelect from '../common/SearchableSelect';
import { FormInput, FormSelect, FormRow } from '../common/FormField';
import Button from '../common/Button';
import { UNIT_OPTIONS } from '../../config/units';
import { computeLineAmounts, formatCurrency } from '../../utils/calculations';

export default function ItemEntryForm({
  form,
  onFieldChange,
  onItemSelect,
  itemOptions,
  isEditing,
  onAdd,
  onClear,
  errors,
}) {
  const liveAmount = useMemo(() => computeLineAmounts(form).amount, [form]);

  return (
    <div className="item-entry-form">
      <div className="item-entry-form__grid">
        <SearchableSelect
          label="Item Name"
          name="item_name"
          placeholder="Search or type a new item..."
          options={itemOptions}
          value={form.item_name}
          onChange={onItemSelect}
          allowCustom
          required
          error={errors.item_name}
          emptyMessage="No items found. Type to add a new one."
        />
        <FormInput
          label="HSN Code"
          name="hsn_code"
          value={form.hsn_code}
          onChange={(v) => onFieldChange('hsn_code', v)}
        />
        <FormSelect
          label="Unit"
          name="unit"
          value={form.unit}
          onChange={(v) => onFieldChange('unit', v)}
          options={UNIT_OPTIONS}
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
          label="Price"
          name="price"
          type="number"
          value={form.price}
          onChange={(v) => onFieldChange('price', v)}
          required
          error={errors.price}
        />
        <FormInput
          label="Discount %"
          name="disc_percent"
          type="number"
          value={form.disc_percent}
          onChange={(v) => onFieldChange('disc_percent', v)}
        />
        <FormInput
          label="SGST %"
          name="sgst"
          type="number"
          value={form.sgst}
          onChange={(v) => onFieldChange('sgst', v)}
        />
        <FormInput
          label="CGST %"
          name="cgst"
          type="number"
          value={form.cgst}
          onChange={(v) => onFieldChange('cgst', v)}
        />
        <FormInput
          label="IGST %"
          name="igst"
          type="number"
          value={form.igst}
          onChange={(v) => onFieldChange('igst', v)}
        />
        <div className="item-entry-form__amount">
          <span className="item-entry-form__amount-label">Amount</span>
          <span className="item-entry-form__amount-value">{formatCurrency(liveAmount)}</span>
        </div>
      </div>

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
