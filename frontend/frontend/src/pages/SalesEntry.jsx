import { useEffect, useMemo, useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SearchableSelect from '../components/common/SearchableSelect';
import { FormInput, FormTextarea, FormCheckbox } from '../components/common/FormField';
import SalesItemEntryForm from '../components/sales/SalesItemEntryForm';
import SalesItemsTable from '../components/sales/SalesItemsTable';
import BillSummaryCard from '../components/sales/BillSummaryCard';
import { useToast } from '../context/ToastContext';
import { useCompany } from '../context/CompanyContext';
import { fetchCustomers, fetchCustomerById } from '../services/customerService';
import { fetchItems } from '../services/itemService';
import { createBill, fetchBillById } from '../services/billService';
import { extractErrorMessage } from '../services/api';
import { computeBillTotals } from '../utils/billCalculations';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import '../styles/PurchaseEntry.css';
import '../styles/SalesEntry.css';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_DETAILS = {
  customer_id: null,
  bill_date: today(),
  is_interstate: false,
  remarks: '',
};

const EMPTY_CUSTOMER_DETAILS = {
  mobile: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  pan_card: '',
  email: '',
};

const EMPTY_ITEM_FORM = {
  item_id: null,
  item_name: '',
  hsn_code: '',
  unit: '',
  gst_rate: 0,
  current_stock: 0,
  quantity: '',
  rate: '',
};

let rowIdCounter = 0;

export default function SalesEntry() {
  const toast = useToast();
  const { company } = useCompany();

  const [customerOptions, setCustomerOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);

  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [detailErrors, setDetailErrors] = useState({});
  const [customerDetails, setCustomerDetails] = useState(EMPTY_CUSTOMER_DETAILS);
  const [customerLoading, setCustomerLoading] = useState(false);

  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [itemErrors, setItemErrors] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);

  const [items, setItems] = useState([]);

  const [saving, setSaving] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const [savedBillDetail, setSavedBillDetail] = useState(null);

  // Load Customers for the searchable dropdown.
  useEffect(() => {
    fetchCustomers({ search: '' })
      .then((data) => {
        const mapped = data
          .filter((c) => c.is_active)
          .map((c) => ({ value: c.id, label: c.customer_name, meta: c.mobile || c.city || undefined }));
        setCustomerOptions(mapped);
      })
      .catch((err) => toast.error(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Item Master list for the item dropdown. `value` is the item id
  // (a real FK, unlike Purchase Entry's item_name) because /bill's payload
  // requires item_id, and there is no "type a new item" mode here -- every
  // line must reference an existing Item Master record.
  useEffect(() => {
    fetchItems({ search: '' })
      .then((data) => {
        const mapped = data.map((i) => ({
          value: i.id,
          label: i.name,
          hsn_code: i.hsn_code,
          unit: i.unit,
          gst_rate: i.gst_rate,
          sale_price: i.sale_price,
          current_stock: i.current_stock,
          meta: `Stock: ${i.current_stock}`,
        }));
        setItemOptions(mapped);
      })
      .catch((err) => toast.error(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => computeBillTotals(items, details.is_interstate), [items, details.is_interstate]);

  // ---------- Section 1 handlers ----------
  const handleDetailChange = (field) => (value) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
    if (detailErrors[field]) setDetailErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleCustomerSelect = (option) => {
    setDetails((prev) => ({ ...prev, customer_id: option ? option.value : null }));
    if (detailErrors.customer_id) setDetailErrors((prev) => ({ ...prev, customer_id: '' }));

    if (!option) {
      setCustomerDetails(EMPTY_CUSTOMER_DETAILS);
      return;
    }

    // The list endpoint doesn't carry address/email/pincode/pan_card, so
    // fetch the full record for the auto-fill panel.
    setCustomerLoading(true);
    fetchCustomerById(option.value)
      .then((full) => {
        setCustomerDetails({
          mobile: full.mobile || '',
          address: full.address || '',
          city: full.city || '',
          state: full.state || '',
          pincode: full.pincode || '',
          gstin: full.gstin || '',
          pan_card: full.pan_card || '',
          email: full.email || '',
        });
      })
      .catch((err) => {
        toast.error(extractErrorMessage(err));
        setCustomerDetails(EMPTY_CUSTOMER_DETAILS);
      })
      .finally(() => setCustomerLoading(false));
  };

  function validateDetails() {
    const errors = {};
    if (!details.customer_id) errors.customer_id = 'Customer is required.';
    if (!details.bill_date) errors.bill_date = 'Bill date is required.';
    return errors;
  }

  // ---------- Section 2 handlers ----------
  const handleItemFieldChange = (field, value) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
    if (itemErrors[field]) setItemErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleItemSelect = (option) => {
    if (!option) {
      setItemForm(EMPTY_ITEM_FORM);
      return;
    }
    setItemForm((prev) => ({
      ...prev,
      item_id: option.value,
      item_name: option.label,
      hsn_code: option.hsn_code || '',
      unit: option.unit || '',
      gst_rate: option.gst_rate ?? 0,
      current_stock: option.current_stock ?? 0,
      rate: option.sale_price ?? prev.rate,
    }));
    if (itemErrors.item_id) setItemErrors((prev) => ({ ...prev, item_id: '' }));
  };

  function validateItemForm() {
    const errors = {};
    if (!itemForm.item_id) errors.item_id = 'Select an item.';
    if (!itemForm.quantity || Number(itemForm.quantity) <= 0) errors.quantity = 'Enter a valid quantity.';
    if (itemForm.rate === '' || Number(itemForm.rate) < 0) errors.rate = 'Enter a valid price.';

    if (!errors.quantity) {
      // Sum quantity already added for this item (excluding the row being
      // edited) so re-adding the same item twice still respects stock.
      const alreadyAdded = items.reduce(
        (sum, row, idx) => (row.item_id === itemForm.item_id && idx !== editingIndex ? sum + Number(row.quantity) : sum),
        0
      );
      if (Number(itemForm.quantity) + alreadyAdded > Number(itemForm.current_stock)) {
        errors.quantity = `Only ${itemForm.current_stock} in stock (${alreadyAdded > 0 ? `${alreadyAdded} already added` : 'requested exceeds stock'}).`;
      }
    }

    return errors;
  }

  const handleAddItem = () => {
    const errors = validateItemForm();
    if (Object.keys(errors).length > 0) {
      setItemErrors(errors);
      return;
    }

    if (editingIndex !== null) {
      setItems((prev) => prev.map((row, idx) => (idx === editingIndex ? { ...itemForm, _rowId: row._rowId } : row)));
      toast.success('Item updated in the table.');
    } else {
      setItems((prev) => [...prev, { ...itemForm, _rowId: ++rowIdCounter }]);
      toast.success('Item added.');
    }

    setItemForm(EMPTY_ITEM_FORM);
    setEditingIndex(null);
    setItemErrors({});
  };

  const handleClearItemForm = () => {
    setItemForm(EMPTY_ITEM_FORM);
    setEditingIndex(null);
    setItemErrors({});
  };

  const handleEditRow = (index) => {
    setItemForm(items[index]);
    setEditingIndex(index);
  };

  const handleDeleteRow = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) handleClearItemForm();
  };

  // ---------- Section 5 handlers ----------
  const resetForm = () => {
    setDetails(EMPTY_DETAILS);
    setDetailErrors({});
    setCustomerDetails(EMPTY_CUSTOMER_DETAILS);
    setItems([]);
    handleClearItemForm();
  };

  const handleSave = () => {
    const errors = validateDetails();
    if (Object.keys(errors).length > 0) {
      setDetailErrors(errors);
      toast.error('Please complete the required fields in Customer Details.');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one item before saving the bill.');
      return;
    }

    const payload = {
      customer_id: details.customer_id,
      bill_date: details.bill_date,
      is_interstate: details.is_interstate,
      remarks: details.remarks || null,
      items: items.map((i) => ({ item_id: i.item_id, quantity: Number(i.quantity) })),
    };

    setSaving(true);
    createBill(payload)
      .then((result) => {
        toast.success(`Bill saved — Invoice No. ${result.invoice_no}.`);
        // Fetch the full detail (with items) for the Print view -- the
        // POST response alone has no items array.
        return fetchBillById(result.bill_id);
      })
      .then((detail) => {
        setSavedBillDetail(detail);
        resetForm();
      })
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setSaving(false));
  };

  const handlePrint = () => {
    if (!savedBillDetail) {
      toast.error('Save the bill first — printing uses the saved invoice number and totals.');
      return;
    }
    const doc = generateInvoicePDF(savedBillDetail, company);
    doc.autoPrint();
    const printWindow = window.open(doc.output('bloburl'), '_blank');
    if (!printWindow) {
      toast.info('Pop-up blocked — downloaded the invoice PDF instead.');
      doc.save(`Invoice_${savedBillDetail.bill.invoice_no}.pdf`);
    }
  };

  return (
    <div className="page sales-entry">
      <div className="purchase-entry__header">
        <div>
          <h1 className="purchase-entry__title">Sales Entry</h1>
          <p className="purchase-entry__subtitle">Create a new sales bill for a customer.</p>
        </div>
      </div>

      {/* SECTION 1: CUSTOMER DETAILS */}
      <Card title="Customer Details" className="purchase-entry__section">
        <div className="purchase-details-grid">
          <SearchableSelect
            label="Customer"
            name="customer_id"
            placeholder="Search customer..."
            options={customerOptions}
            value={details.customer_id}
            onChange={handleCustomerSelect}
            required
            error={detailErrors.customer_id}
            emptyMessage="No customers found. Add one in Customer Management first."
          />
          <FormInput
            label="Bill Date"
            name="bill_date"
            type="date"
            value={details.bill_date}
            onChange={handleDetailChange('bill_date')}
            required
            error={detailErrors.bill_date}
          />
          <div className="form-field">
            <label className="form-field__label">Invoice Number</label>
            <span className="purchase-details-grid__auto-value">Generated automatically when you save</span>
          </div>
          <FormCheckbox
            label="Interstate Supply (IGST)"
            name="is_interstate"
            checked={details.is_interstate}
            onChange={handleDetailChange('is_interstate')}
          />

          <FormInput label="Mobile" name="mobile" value={customerLoading ? 'Loading...' : customerDetails.mobile} onChange={() => {}} disabled />
          <FormInput label="GSTIN" name="gstin" value={customerLoading ? 'Loading...' : customerDetails.gstin} onChange={() => {}} disabled />
          <FormInput label="PAN" name="pan_card" value={customerLoading ? 'Loading...' : customerDetails.pan_card} onChange={() => {}} disabled />
          <FormInput label="State" name="state" value={customerLoading ? 'Loading...' : customerDetails.state} onChange={() => {}} disabled />

          <div className="purchase-details-grid__full">
            <FormTextarea
              label="Address"
              name="address"
              value={customerLoading ? 'Loading...' : [customerDetails.address, customerDetails.city, customerDetails.pincode].filter(Boolean).join(', ')}
              onChange={() => {}}
              rows={2}
              disabled
            />
          </div>

          <div className="purchase-details-grid__full">
            <FormTextarea
              label="Remarks"
              name="remarks"
              value={details.remarks}
              onChange={handleDetailChange('remarks')}
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* SECTION 2: ITEM ENTRY */}
      <Card
        title="Item Entry"
        subtitle="Search an item from Item Master, enter quantity — price and GST are pulled in automatically."
        className="purchase-entry__section"
      >
        <SalesItemEntryForm
          form={itemForm}
          onFieldChange={handleItemFieldChange}
          onItemSelect={handleItemSelect}
          itemOptions={itemOptions}
          isEditing={editingIndex !== null}
          isInterstate={details.is_interstate}
          onAdd={handleAddItem}
          onClear={handleClearItemForm}
          errors={itemErrors}
        />
      </Card>

      {/* SECTION 3: BILL ITEMS TABLE */}
      <Card title={`Bill Items ${items.length ? `(${items.length})` : ''}`} className="purchase-entry__section">
        <SalesItemsTable items={items} isInterstate={details.is_interstate} onEdit={handleEditRow} onDelete={handleDeleteRow} />
      </Card>

      {/* SECTION 4: LIVE TOTALS (right aligned, sticky) */}
      <div className="purchase-entry__summary-row">
        <Card title="Total Summary" className="purchase-entry__summary-card">
          <BillSummaryCard totals={totals} isInterstate={details.is_interstate} />
        </Card>
      </div>

      {/* SECTION 5: ACTION BUTTONS */}
      <div className="purchase-entry__footer-actions">
        <Button variant="secondary" onClick={() => setResetConfirmOpen(true)} disabled={saving}>
          Reset
        </Button>
        <Button variant="ghost" onClick={handlePrint} disabled={saving}>
          Print
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Bill'}
        </Button>
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset Sales Entry"
        message="This will clear all entered details and items on this page. This cannot be undone."
        confirmLabel="Reset"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetForm();
          setResetConfirmOpen(false);
        }}
      />
    </div>
  );
}
