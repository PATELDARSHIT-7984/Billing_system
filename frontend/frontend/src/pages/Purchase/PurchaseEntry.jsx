import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SearchableSelect from '../../components/common/SearchableSelect';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
} from '../../components/common/FormField';
import PartyFormModal from '../PartyFormModal';
import ItemFormModal from '../ItemFormModal';
import { useToast } from '../../context/ToastContext';
import { fetchParties, createParty } from '../../services/partyService';
import { fetchItems, createItem } from '../../services/itemService';
import { createPurchase, fetchPurchaseById, updatePurchase } from '../../services/purchaseService';
import { extractErrorMessage } from '../../services/api';
import { UNIT_OPTIONS } from '../../config/units';
import {
  computeLineAmounts,
  computeTotals,
  formatCurrency,
} from '../../utils/calculations';
import '../../styles/PurchaseEntry.css';

const today = () => new Date().toISOString().slice(0, 10);

const STATES = [
  '',
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

const STATE_OPTIONS = STATES.map((value) => ({
  value,
  label: value || 'Select State',
}));

const DONE_BY_OPTIONS = [
  { value: '', label: 'Select person' },
  { value: 'Lalit', label: 'Lalit' },
  { value: 'Darshit', label: 'Darshit' },
];

const createEmptyDetails = () => ({
  party_id: null,
  bill_no: '',
  order_no: '',
  bill_date: today(),
  due_term: '',
  due_date: '',
  is_gst: true,
  address: '',
  city: '',
  party_state: '',
  contact_no: '',
  email: '',
  done_by: '',
  brokerage: 0,
  broker_remarks: '',
  delivery_date: '',
  ship_to: '',
  ship_to_address: '',
  ship_state: '',
  transport: '',
  reference: '',
  remarks: '',
  show_shipping_address_on_bill: false,
});

const createEmptyItem = () => ({
  item_id: null,
  item_name: '',
  hsn_code: '',
  quantity: '',
  unit: UNIT_OPTIONS[0]?.value || 'Box',
  price: '',
  disc_percent: 0,
  sgst: 0,
  cgst: 0,
  igst: 0,
});

let rowCounter = 0;

function addDays(dateString, daysValue) {
  if (!dateString || daysValue === '' || Number(daysValue) < 0) return '';

  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + Number(daysValue));
  return date.toISOString().slice(0, 10);
}

export default function PurchaseEntry() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const loadedEditId = useRef(null);

  const [parties, setParties] = useState([]);
  const [itemRecords, setItemRecords] = useState([]);
  const [details, setDetails] = useState(createEmptyDetails);
  const [itemForm, setItemForm] = useState(createEmptyItem);
  const [items, setItems] = useState([]);
  const [detailErrors, setDetailErrors] = useState({});
  const [itemErrors, setItemErrors] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [submittingParty, setSubmittingParty] = useState(false);
  const [submittingItem, setSubmittingItem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPurchase, setLoadingPurchase] = useState(false);

  const loadParties = () => (
    fetchParties({ search: '' })
      .then((data) => setParties(data.filter((party) => party.party_type === 'Supplier')))
      .catch((error) => toast.error(extractErrorMessage(error)))
  );

  const loadItems = () => (
    fetchItems({ search: '' })
      .then((data) => setItemRecords(data.filter((item) => item.is_active !== false)))
      .catch((error) => toast.error(extractErrorMessage(error)))
  );

  useEffect(() => {
    loadParties();
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!editId || !parties.length || loadedEditId.current === editId) return;

    setLoadingPurchase(true);
    fetchPurchaseById(editId)
      .then((purchase) => {
        const selectedParty = parties.find((party) => party.id === purchase.party_id);

        setDetails({
          party_id: purchase.party_id,
          bill_no: purchase.bill_no || '',
          order_no: purchase.order_no || '',
          bill_date: purchase.bill_date || today(),
          due_term: purchase.due_term ?? '',
          due_date: purchase.due_date || '',
          is_gst: purchase.is_gst !== false,
          address: selectedParty?.address || '',
          city: selectedParty?.city || '',
          party_state: selectedParty?.state || '',
          contact_no: purchase.contact_no || (
            selectedParty
              ? `${selectedParty.country_code || ''} ${selectedParty.mobile || ''}`.trim()
              : ''
          ),
          email: purchase.email || selectedParty?.email || '',
          done_by: purchase.done_by || '',
          brokerage: purchase.brokerage ?? 0,
          broker_remarks: purchase.broker_remarks || '',
          delivery_date: purchase.delivery_date || '',
          ship_to: purchase.ship_to || '',
          ship_to_address: purchase.ship_to_address || '',
          ship_state: purchase.state || '',
          transport: purchase.transport || '',
          reference: purchase.reference || '',
          remarks: purchase.remarks || '',
          show_shipping_address_on_bill: Boolean(purchase.show_shipping_address_on_bill),
        });

        setItems((purchase.items || []).map((item) => ({
          ...item,
          _rowId: ++rowCounter,
        })));

        loadedEditId.current = editId;
      })
      .catch((error) => {
        toast.error(extractErrorMessage(error));
        navigate('/purchase-history');
      })
      .finally(() => setLoadingPurchase(false));
  }, [editId, parties, navigate, toast]);

  const partyOptions = useMemo(
    () => parties.map((party) => ({
      value: party.id,
      label: party.name,
      meta: party.city || party.mobile || '',
      record: party,
    })),
    [parties],
  );

  const itemOptions = useMemo(
    () => itemRecords.map((item) => ({
      value: item.id,
      label: item.name,
      meta: item.hsn_code ? `HSN ${item.hsn_code}` : 'HSN not set',
      record: item,
    })),
    [itemRecords],
  );

  const categoryOptions = useMemo(
    () => [...new Set(itemRecords.map((item) => item.category).filter(Boolean))]
      .map((value) => ({ value, label: value })),
    [itemRecords],
  );

  const brandOptions = useMemo(
    () => [...new Set(itemRecords.map((item) => item.brand).filter(Boolean))]
      .map((value) => ({ value, label: value })),
    [itemRecords],
  );

  const totals = useMemo(() => computeTotals(items), [items]);
  const liveAmount = useMemo(() => computeLineAmounts(itemForm).amount, [itemForm]);

  const changeDetail = (field, value) => {
    if (field === 'is_gst' && !value) {
      setItemForm((previous) => ({ ...previous, sgst: 0, cgst: 0, igst: 0 }));
      setItems((previous) => previous.map((item) => ({ ...item, sgst: 0, cgst: 0, igst: 0 })));
    }

    setDetails((previous) => {
      const next = { ...previous, [field]: value };

      if (field === 'bill_date' || field === 'due_term') {
        next.due_date = addDays(
          field === 'bill_date' ? value : previous.bill_date,
          field === 'due_term' ? value : previous.due_term,
        );
      }

      return next;
    });

    setDetailErrors((previous) => ({ ...previous, [field]: '' }));
  };

  const applySelectedParty = (party) => {
    setDetails((previous) => ({
      ...previous,
      party_id: party?.id || null,
      address: party?.address || '',
      city: party?.city || '',
      party_state: party?.state || '',
      contact_no: party
        ? `${party.country_code || ''} ${party.mobile || ''}`.trim()
        : '',
      email: party?.email || '',

      // A supplier change must never carry the previous supplier's
      // delivery address into the new bill.
      delivery_date: '',
      ship_to: '',
      ship_to_address: '',
      ship_state: '',
      transport: '',
      reference: '',
      remarks: '',
      show_shipping_address_on_bill: false,
    }));

    // Clear only supplier-dependent transaction data. Bill number,
    // order number, dates, due term, Done By and brokerage stay intact.
    setItems([]);
    setItemForm(createEmptyItem());
    setEditingIndex(null);
    setItemErrors({});
    setDetailErrors((previous) => ({
      ...previous,
      party_id: '',
      ship_to: '',
      ship_to_address: '',
      ship_state: '',
    }));
  };

  const selectParty = (option) => {
    const nextParty = option?.record || null;
    const nextPartyId = nextParty?.id || null;

    // SearchableSelect may call onChange more than once while the user is
    // interacting. Do nothing unless the actual supplier ID changed.
    if (nextPartyId === details.party_id) return;

    applySelectedParty(nextParty);

    if (nextParty) {
      toast.success('Supplier changed. Items and delivery details were cleared.');
    }
  };

  const saveParty = (payload) => {
    setSubmittingParty(true);

    createParty({ ...payload, party_type: 'Supplier' })
      .then((created) => {
        setParties((previous) => [...previous, created]);
        applySelectedParty(created);
        setPartyModalOpen(false);
        toast.success('Supplier added and selected. Items and delivery details were cleared.');
      })
      .catch((error) => toast.error(extractErrorMessage(error)))
      .finally(() => setSubmittingParty(false));
  };

  const selectItem = (option) => {
    if (!option) {
      setItemForm((previous) => ({
        ...previous,
        item_id: null,
        item_name: '',
      }));
      return;
    }

    const item = option.record;

    setItemForm((previous) => ({
      ...previous,
      item_id: item.id,
      item_name: item.name,
      hsn_code: item.hsn_code || '',
      unit: item.unit || previous.unit,
      price: item.purchase_price ?? previous.price,
      cgst: item.cgst ?? previous.cgst,
      sgst: item.sgst ?? previous.sgst,
      igst: 0,
    }));

    setItemErrors((previous) => ({
      ...previous,
      item_id: '',
      item_name: '',
      hsn_code: '',
    }));
  };

  const saveNewItem = (payload) => {
    setSubmittingItem(true);

    createItem(payload)
      .then((created) => {
        setItemRecords((previous) => [...previous, created]);
        selectItem({ value: created.id, label: created.name, record: created });
        setItemModalOpen(false);
        toast.success('Item added and selected. Continue the purchase entry.');
      })
      .catch((error) => toast.error(extractErrorMessage(error)))
      .finally(() => setSubmittingItem(false));
  };

  const changeItem = (field, value) => {
    setItemForm((previous) => {
      const next = { ...previous, [field]: value };

      if ((field === 'sgst' || field === 'cgst') && Number(value) > 0) {
        next.igst = 0;
      }

      if (field === 'igst' && Number(value) > 0) {
        next.sgst = 0;
        next.cgst = 0;
      }

      return next;
    });

    setItemErrors((previous) => ({ ...previous, [field]: '' }));
  };

  const addItem = () => {
    const errors = {};

    if (!itemForm.item_id) errors.item_name = 'Select an item from Item Master.';
    if (!itemForm.hsn_code.trim()) errors.hsn_code = 'HSN code is required.';
    if (!itemForm.quantity || Number(itemForm.quantity) <= 0) {
      errors.quantity = 'Enter a valid quantity.';
    }
    if (itemForm.price === '' || Number(itemForm.price) < 0) {
      errors.price = 'Enter a valid price.';
    }

    if (Object.keys(errors).length) {
      setItemErrors(errors);
      return;
    }

    if (editingIndex === null) {
      setItems((previous) => [
        ...previous,
        { ...itemForm, _rowId: ++rowCounter },
      ]);
    } else {
      setItems((previous) => previous.map((row, index) => (
        index === editingIndex
          ? { ...itemForm, _rowId: row._rowId }
          : row
      )));
    }

    setItemForm(createEmptyItem());
    setEditingIndex(null);
    setItemErrors({});
  };

  const clearItemForm = () => {
    setItemForm(createEmptyItem());
    setEditingIndex(null);
    setItemErrors({});
  };

  const clearAll = () => {
    setDetails(createEmptyDetails());
    setItemForm(createEmptyItem());
    setItems([]);
    setEditingIndex(null);
    setDetailErrors({});
    setItemErrors({});
  };

  const validatePurchase = () => {
    const errors = {};

    if (!details.party_id) errors.party_id = 'Supplier is required.';
    if (!details.bill_no.trim()) errors.bill_no = 'Bill number is required.';
    if (!details.bill_date) errors.bill_date = 'Bill date is required.';

    if (details.show_shipping_address_on_bill) {
      if (!details.ship_to.trim()) errors.ship_to = 'Ship To is required.';
      if (!details.ship_to_address.trim()) {
        errors.ship_to_address = 'Ship To Address is required.';
      }
      if (!details.ship_state) errors.ship_state = 'Shipping state is required.';
    }

    return errors;
  };

  const savePurchase = () => {
    const errors = validatePurchase();
    setDetailErrors(errors);

    if (Object.keys(errors).length) {
      toast.error('Please complete the required purchase details.');
      return;
    }

    if (!items.length) {
      toast.error('Add at least one item before saving.');
      return;
    }

    const payload = {
      bill_no: details.bill_no.trim(),
      order_no: details.order_no.trim() || null,
      bill_date: details.bill_date,
      due_term: details.due_term === '' ? null : Number(details.due_term),
      due_date: details.due_date || null,
      party_id: Number(details.party_id),
      is_gst: Boolean(details.is_gst),
      contact_person: null,
      contact_no: details.contact_no.trim() || null,
      email: details.email.trim() || null,
      done_by: details.done_by || null,
      brokerage: Number(details.brokerage) || 0,
      broker_remarks: details.broker_remarks.trim() || null,
      items: items.map((item) => ({
        item_id: Number(item.item_id),
        item_name: item.item_name,
        hsn_code: item.hsn_code.trim(),
        quantity: Number(item.quantity),
        unit: item.unit,
        price: Number(item.price),
        disc_percent: Number(item.disc_percent) || 0,
        sgst: details.is_gst ? Number(item.sgst) || 0 : 0,
        cgst: details.is_gst ? Number(item.cgst) || 0 : 0,
        igst: details.is_gst ? Number(item.igst) || 0 : 0,
      })),
      delivery_date: details.delivery_date || null,
      transport: details.transport.trim() || null,
      ship_to: details.ship_to.trim() || null,
      ship_to_address: details.ship_to_address.trim() || null,
      state: details.ship_state || null,
      reference: details.reference.trim() || null,
      remarks: details.remarks.trim() || null,
      show_shipping_address_on_bill: Boolean(
        details.show_shipping_address_on_bill,
      ),
    };

    setSaving(true);

    const request = editId
      ? updatePurchase(editId, payload)
      : createPurchase(payload);

    request
      .then((savedPurchase) => {
        toast.success(
          editId
            ? `Purchase updated successfully. Bill No. ${savedPurchase.bill_no}`
            : `Purchase saved successfully. Bill No. ${savedPurchase.bill_no}`,
        );

        if (editId) {
          navigate('/purchase-history');
        } else {
          clearAll();
        }
      })
      .catch((error) => toast.error(extractErrorMessage(error)))
      .finally(() => setSaving(false));
  };

  return (
    <div className="page general-transaction purchase-entry-final">
      <header className="gt-page-header">
        <div>
          <h1>{editId ? 'Update Purchase' : 'Purchase Entry'}</h1>
          <p>{editId ? 'Update the selected purchase bill and its transaction items.' : 'Create and save a supplier purchase bill using the verified transaction layout.'}</p>
        </div>
        <span className="gt-status">{editId ? 'Edit Purchase' : 'Purchase'}</span>
      </header>

      {loadingPurchase && (
        <div className="gt-loading-note">Loading purchase details...</div>
      )}

      <Card title="Transaction Details" className="gt-card">
        <div className="gt-details-grid">
          <div className="gt-with-action">
            <SearchableSelect
              label="Supplier"
              name="party_id"
              options={partyOptions}
              value={details.party_id}
              onChange={selectParty}
              placeholder="Search supplier..."
              required
              error={detailErrors.party_id}
              emptyMessage="No supplier found. Use + to add one."
            />
            <button
              type="button"
              className="gt-plus"
              onClick={() => setPartyModalOpen(true)}
              title="Add new supplier"
              aria-label="Add new supplier"
            >
              +
            </button>
          </div>

          <FormInput
            label="Bill No."
            value={details.bill_no}
            onChange={(value) => changeDetail('bill_no', value)}
            placeholder="Enter supplier bill number"
            required
            error={detailErrors.bill_no}
          />

          <FormInput
            label="Order No."
            value={details.order_no}
            onChange={(value) => changeDetail('order_no', value)}
            placeholder="Enter order number"
          />

          <FormInput
            label="Bill Date"
            type="date"
            value={details.bill_date}
            onChange={(value) => changeDetail('bill_date', value)}
            required
            error={detailErrors.bill_date}
          />

          <FormInput
            label="Due Term (Days)"
            type="number"
            min="0"
            value={details.due_term}
            onChange={(value) => changeDetail('due_term', value)}
            placeholder="e.g. 30"
          />

          <FormInput
            label="Due Date"
            type="date"
            value={details.due_date}
            disabled
          />

          <FormTextarea
            label="Address"
            value={details.address}
            onChange={(value) => changeDetail('address', value)}
            rows={2}
          />

          <FormInput
            label="City"
            value={details.city}
            onChange={(value) => changeDetail('city', value)}
          />

          <FormSelect
            label="State"
            value={details.party_state || ''}
            onChange={(value) => changeDetail('party_state', value)}
            options={STATE_OPTIONS}
          />

          <FormInput
            label="Contact No."
            value={details.contact_no}
            onChange={(value) => changeDetail('contact_no', value)}
          />

          <FormInput
            label="Email (Optional)"
            type="email"
            value={details.email}
            onChange={(value) => changeDetail('email', value)}
          />

          <FormSelect
            label="Done By"
            value={details.done_by}
            onChange={(value) => changeDetail('done_by', value)}
            options={DONE_BY_OPTIONS}
          />

          <FormCheckbox
            label="GST Applicable"
            checked={details.is_gst}
            onChange={(value) => changeDetail('is_gst', value)}
          />

          <FormInput
            label="Brokerage"
            type="number"
            min="0"
            value={details.brokerage}
            onChange={(value) => changeDetail('brokerage', value)}
          />

          <div className="gt-span-2">
            <FormInput
              label="Broker's Remarks"
              value={details.broker_remarks}
              onChange={(value) => changeDetail('broker_remarks', value)}
            />
          </div>
        </div>
      </Card>

      <Card
        title="Item Entry"
        subtitle="Search an existing item or add a new item without leaving this purchase."
        className="gt-card"
      >
        <div className="gt-item-top">
          <div className="gt-with-action">
            <SearchableSelect
              label="Item Name"
              name="item_name"
              options={itemOptions}
              value={itemForm.item_id}
              onChange={selectItem}
              placeholder="Search item name..."
              required
              error={itemErrors.item_name}
              emptyMessage="No matching item. Use + to add one."
            />
            <button
              type="button"
              className="gt-plus"
              onClick={() => setItemModalOpen(true)}
              title="Add new item"
              aria-label="Add new item"
            >
              +
            </button>
          </div>

          <FormInput
            label="HSN Code"
            value={itemForm.hsn_code}
            onChange={(value) => changeItem('hsn_code', value)}
            required
            error={itemErrors.hsn_code}
          />

          <FormSelect
            label="Unit"
            value={itemForm.unit}
            onChange={(value) => changeItem('unit', value)}
            options={UNIT_OPTIONS}
          />
        </div>

        <div className="gt-item-numbers">
          <FormInput
            label="Quantity"
            type="number"
            min="0"
            value={itemForm.quantity}
            onChange={(value) => changeItem('quantity', value)}
            required
            error={itemErrors.quantity}
          />

          <FormInput
            label="Price"
            type="number"
            min="0"
            value={itemForm.price}
            onChange={(value) => changeItem('price', value)}
            required
            error={itemErrors.price}
          />

          <FormInput
            label="Discount %"
            type="number"
            min="0"
            max="100"
            value={itemForm.disc_percent}
            onChange={(value) => changeItem('disc_percent', value)}
          />

          <FormInput
            label="SGST %"
            type="number"
            min="0"
            max="100"
            value={details.is_gst ? itemForm.sgst : 0}
            onChange={(value) => changeItem('sgst', value)}
            disabled={!details.is_gst || Number(itemForm.igst) > 0}
          />

          <FormInput
            label="CGST %"
            type="number"
            min="0"
            max="100"
            value={details.is_gst ? itemForm.cgst : 0}
            onChange={(value) => changeItem('cgst', value)}
            disabled={!details.is_gst || Number(itemForm.igst) > 0}
          />

          <FormInput
            label="IGST %"
            type="number"
            min="0"
            max="100"
            value={details.is_gst ? itemForm.igst : 0}
            onChange={(value) => changeItem('igst', value)}
            disabled={
              !details.is_gst
              || Number(itemForm.sgst) > 0
              || Number(itemForm.cgst) > 0
            }
          />

          <div className="gt-live-amount">
            <span>Amount</span>
            <strong>{formatCurrency(liveAmount)}</strong>
          </div>
        </div>

        <div className="gt-item-actions">
          <Button variant="secondary" onClick={clearItemForm}>Clear</Button>
          <Button variant="primary" onClick={addItem}>
            {editingIndex === null ? 'Add Item' : 'Update Item'}
          </Button>
        </div>
      </Card>

      <Card title="Transaction Items" className="gt-card">
        <div className="gt-table-wrap">
          <table className="gt-table">
            <thead>
              <tr>
                <th>Sr.</th><th>Item</th><th>HSN</th><th>Qty</th><th>Unit</th>
                <th>Price</th><th>Disc.</th><th>SGST</th><th>CGST</th><th>IGST</th>
                <th>Amount</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!items.length ? (
                <tr>
                  <td colSpan="12" className="gt-empty">
                    No items added yet. Use the item form above.
                  </td>
                </tr>
              ) : items.map((row, index) => (
                <tr key={row._rowId}>
                  <td>{index + 1}</td>
                  <td>{row.item_name}</td>
                  <td>{row.hsn_code}</td>
                  <td>{row.quantity}</td>
                  <td>{row.unit}</td>
                  <td>{formatCurrency(row.price)}</td>
                  <td>{row.disc_percent}%</td>
                  <td>{row.sgst}%</td>
                  <td>{row.cgst}%</td>
                  <td>{row.igst}%</td>
                  <td>{formatCurrency(computeLineAmounts(row).amount)}</td>
                  <td>
                    <button
                      type="button"
                      className="gt-link"
                      onClick={() => {
                        setItemForm(row);
                        setEditingIndex(index);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="gt-link gt-link--danger"
                      onClick={() => setItems((previous) => (
                        previous.filter((_, rowIndex) => rowIndex !== index)
                      ))}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="gt-bottom-grid">
        <Card title="Extra Address & Delivery Details" className="gt-card">
          <FormCheckbox
            label="Show this shipping address on bill"
            checked={details.show_shipping_address_on_bill}
            onChange={(value) => changeDetail('show_shipping_address_on_bill', value)}
          />

          <div className="gt-delivery-grid">
            <FormInput
              label="Delivery Date"
              type="date"
              value={details.delivery_date}
              onChange={(value) => changeDetail('delivery_date', value)}
            />

            <FormInput
              label="Ship To"
              value={details.ship_to}
              onChange={(value) => changeDetail('ship_to', value)}
              required={details.show_shipping_address_on_bill}
              error={detailErrors.ship_to}
            />

            <FormInput
              label="Transport"
              value={details.transport}
              onChange={(value) => changeDetail('transport', value)}
            />

            <div className="gt-span-2">
              <FormTextarea
                label="Ship To Address"
                value={details.ship_to_address}
                onChange={(value) => changeDetail('ship_to_address', value)}
                rows={3}
                required={details.show_shipping_address_on_bill}
                error={detailErrors.ship_to_address}
              />
            </div>

            <FormSelect
              label="State"
              value={details.ship_state}
              onChange={(value) => changeDetail('ship_state', value)}
              options={STATE_OPTIONS}
              required={details.show_shipping_address_on_bill}
              error={detailErrors.ship_state}
            />

            <FormInput
              label="Reference"
              value={details.reference}
              onChange={(value) => changeDetail('reference', value)}
            />

            <div className="gt-span-2">
              <FormTextarea
                label="Remarks"
                value={details.remarks}
                onChange={(value) => changeDetail('remarks', value)}
                rows={3}
              />
            </div>
          </div>
        </Card>

        <Card title="Total Summary" className="gt-card gt-summary">
          <div><span>Taxable Amount</span><strong>{formatCurrency(totals.taxableAmount)}</strong></div>
          <div><span>SGST Total</span><strong>{formatCurrency(totals.sgstTotal)}</strong></div>
          <div><span>CGST Total</span><strong>{formatCurrency(totals.cgstTotal)}</strong></div>
          <div><span>IGST Total</span><strong>{formatCurrency(totals.igstTotal)}</strong></div>
          <div className="gt-grand"><span>Grand Total</span><strong>{formatCurrency(totals.grandTotal)}</strong></div>
        </Card>
      </div>

      <div className="gt-footer-actions">
        <Button variant="secondary" onClick={clearAll} disabled={saving}>
          Clear
        </Button>
        <Button variant="primary" onClick={savePurchase} disabled={saving}>
          {saving ? (editId ? 'Updating Purchase...' : 'Saving Purchase...') : (editId ? 'Update Purchase' : 'Save Purchase')}
        </Button>
      </div>

      <PartyFormModal
        open={partyModalOpen}
        mode="add"
        submitting={submittingParty}
        onClose={() => setPartyModalOpen(false)}
        onSubmit={saveParty}
      />

      <ItemFormModal
        open={itemModalOpen}
        mode="add"
        categoryOptions={categoryOptions}
        brandOptions={brandOptions}
        submitting={submittingItem}
        onClose={() => setItemModalOpen(false)}
        onSubmit={saveNewItem}
      />
    </div>
  );
}
