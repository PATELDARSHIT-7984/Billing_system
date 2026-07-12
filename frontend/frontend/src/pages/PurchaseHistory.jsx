import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PurchaseDetailModal from './PurchaseDetailModal';
import { useToast } from '../context/ToastContext';
import { fetchPurchases, fetchPurchaseById, deletePurchase } from '../services/purchaseService';
import { extractErrorMessage } from '../services/api';
import { formatCurrency } from '../utils/calculations';
import './PurchaseHistory.css';

export default function PurchaseHistory() {
  const toast = useToast();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadPurchases = useCallback((searchTerm) => {
    setLoading(true);
    fetchPurchases({ search: searchTerm })
      .then(setPurchases)
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPurchases('');
  }, [loadPurchases]);

  useEffect(() => {
    const timer = setTimeout(() => loadPurchases(search), 350);
    return () => clearTimeout(timer);
  }, [search, loadPurchases]);

  const COLUMNS = [
    { key: 'bill_no', label: 'Bill No.', render: (row) => <span className="purchase-history__bill-no">#{row.bill_no}</span> },
    {
      key: 'bill_date',
      label: 'Bill Date',
      render: (row) => new Date(row.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    { key: 'party_name', label: 'Supplier', render: (row) => row.party_name || '—' },
    { key: 'item_count', label: 'Items', align: 'right', render: (row) => row.item_count },
    {
      key: 'grand_total',
      label: 'Grand Total',
      align: 'right',
      render: (row) => <strong>{formatCurrency(row.grand_total)}</strong>,
    },
  ];

  const openDetail = (row) => {
    setDetailLoading(true);
    setDetailOpen(true);
    fetchPurchaseById(row.id)
      .then(setDetailData)
      .catch((err) => {
        toast.error(extractErrorMessage(err));
        setDetailOpen(false);
      })
      .finally(() => setDetailLoading(false));
  };

  const askDelete = (row) => {
    setPurchaseToDelete(row);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    setDeleting(true);
    deletePurchase(purchaseToDelete.id)
      .then(() => {
        toast.success(`Bill #${purchaseToDelete.bill_no} deleted successfully.`);
        setConfirmOpen(false);
        setPurchaseToDelete(null);
        loadPurchases(search);
      })
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="page">
      <PageHeader
        title="Purchase History"
        subtitle="Every purchase bill you've recorded — click a row to see the full breakdown."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by bill number or supplier..."
      />

      <DataTable
        columns={COLUMNS}
        rows={purchases}
        loading={loading}
        onRowClick={openDetail}
        onDelete={askDelete}
        emptyMessage={search ? `No purchases match "${search}".` : 'No purchases recorded yet. Create one from Purchase Entry.'}
      />

      <PurchaseDetailModal
        open={detailOpen}
        loading={detailLoading}
        purchase={detailData}
        onClose={() => setDetailOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Purchase"
        message={`Are you sure you want to delete Bill #${purchaseToDelete?.bill_no}? This will also roll back the stock it added to Item Master. This cannot be undone.`}
        loading={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
