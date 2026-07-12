import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Badge from '../components/common/Badge';
import ItemFormModal from './ItemFormModal';
import { useToast } from '../context/ToastContext';
import {
  fetchItems,
  fetchItemById,
  createItem,
  updateItem,
  deleteItem,
} from '../services/itemService';
import { extractErrorMessage } from '../services/api';
import { formatCurrency } from '../utils/calculations';
import './ItemMaster.css';

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export default function ItemMaster() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedItem, setSelectedItem] = useState(null); // full ItemMasterResponse, only set in edit mode
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback((searchTerm) => {
    setLoading(true);
    fetchItems({ search: searchTerm })
      .then(setItems)
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load
  useEffect(() => {
    loadItems('');
  }, [loadItems]);

  // Debounced search -- refetches from the backend's `search` query param
  useEffect(() => {
    const timer = setTimeout(() => loadItems(search), 350);
    return () => clearTimeout(timer);
  }, [search, loadItems]);

  // The list endpoint (ItemMasterListResponse) already returns category/brand
  // for the rows on screen, which is exactly what we want here -- lets the
  // Add/Edit form suggest previously-used values without a separate API call.
  const categoryOptions = useMemo(
    () => uniqueSorted(items.map((i) => i.category)).map((v) => ({ value: v, label: v })),
    [items]
  );
  const brandOptions = useMemo(
    () => uniqueSorted(items.map((i) => i.brand)).map((v) => ({ value: v, label: v })),
    [items]
  );

  const COLUMNS = [
    {
      key: 'name',
      label: 'Item Name',
      render: (row) => (
        <div className="item-master__name-cell">
          <span className="item-master__name">{row.name}</span>
          {row.code && <span className="item-master__code">Code: {row.code}</span>}
        </div>
      ),
    },
    { key: 'category', label: 'Category', render: (row) => row.category || '—' },
    { key: 'brand', label: 'Brand', render: (row) => row.brand || '—' },
    {
      key: 'current_stock',
      label: 'Stock',
      align: 'right',
      render: (row) =>
        row.current_stock <= 0 ? (
          <Badge tone="red">Out of Stock</Badge>
        ) : (
          <span>{row.current_stock}</span>
        ),
    },
    {
      key: 'purchase_price',
      label: 'Purchase Price',
      align: 'right',
      render: (row) => formatCurrency(row.purchase_price),
    },
    {
      key: 'sale_price',
      label: 'Sale Price',
      align: 'right',
      render: (row) => formatCurrency(row.sale_price),
    },
    {
      key: 'cgst',
      label: 'CGST %',
      align: 'right',
      render: (row) => `${row.cgst}%`,
    },
    {
      key: 'sgst',
      label: 'SGST %',
      align: 'right',
      render: (row) => `${row.sgst}%`,
    },
  ];

  const openAddModal = () => {
    setModalMode('add');
    setSelectedItem(null);
    setModalOpen(true);
  };

  // The table row only carries ItemMasterListResponse fields (no mrp,
  // description, or dates) -- fetch the full record before opening the form so nothing gets silently blanked out on save.
  const openEditModal = (row) => {
    fetchItemById(row.id)
      .then((fullItem) => {
        setModalMode('edit');
        setSelectedItem(fullItem);
        setModalOpen(true);
      })
      .catch((err) => toast.error(extractErrorMessage(err)));
  };

  const handleFormSubmit = (payload) => {
    setSubmitting(true);
    const request =
      modalMode === 'edit' ? updateItem(selectedItem.id, payload) : createItem(payload);

    request
      .then(() => {
        toast.success(modalMode === 'edit' ? 'Item updated successfully.' : 'Item added successfully.');
        setModalOpen(false);
        loadItems(search);
      })
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setSubmitting(false));
  };

  const askDelete = (item) => {
    setItemToDelete(item);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    setDeleting(true);
    deleteItem(itemToDelete.id)
      .then(() => {
        toast.success(`"${itemToDelete.name}" deleted successfully.`);
        setConfirmOpen(false);
        setItemToDelete(null);
        loadItems(search);
      })
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="page">
      <PageHeader
        title="Item Master"
        subtitle="Manage your tile inventory -- pricing, stock, and GST details."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by item name..."
        onAddClick={openAddModal}
        addLabel="Add Item"
      />

      <DataTable
        columns={COLUMNS}
        rows={items}
        loading={loading}
        onEdit={openEditModal}
        onDelete={askDelete}
        emptyMessage={search ? `No items match "${search}".` : 'No items added yet. Click "Add Item" to create one.'}
      />

      <ItemFormModal
        open={modalOpen}
        mode={modalMode}
        initialData={selectedItem}
        categoryOptions={categoryOptions}
        brandOptions={brandOptions}
        submitting={submitting}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Item"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This cannot be undone.`}
        loading={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
