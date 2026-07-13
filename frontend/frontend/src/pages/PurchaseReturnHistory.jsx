import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import PurchaseReturnDetailModal from './PurchaseReturnDetailModal';
import { useToast } from '../context/ToastContext';
import {
  fetchPurchaseReturnById,
  fetchPurchaseReturns,
} from '../services/purchaseReturnService';
import { extractErrorMessage } from '../services/api';
import { formatCurrency } from '../utils/calculations';
import './PurchaseHistory.css';

function compact(values = []) {
  const safe = values.filter(Boolean);
  if (!safe.length) return '—';
  if (safe.length === 1) return safe[0];
  return `${safe[0]} (+${safe.length - 1} more)`;
}

export default function PurchaseReturnHistory() {
  const toast = useToast();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const loadRecords = useCallback((searchTerm) => {
    setLoading(true);

    fetchPurchaseReturns({ search: searchTerm })
      .then(setRecords)
      .catch((error) => toast.error(extractErrorMessage(error)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRecords('');
  }, [loadRecords]);

  useEffect(() => {
    const timer = setTimeout(() => loadRecords(search), 350);
    return () => clearTimeout(timer);
  }, [search, loadRecords]);

  const openDetail = (row) => {
    setDetailOpen(true);
    setDetailLoading(true);

    fetchPurchaseReturnById(row.id)
      .then(setDetailData)
      .catch((error) => {
        toast.error(extractErrorMessage(error));
        setDetailOpen(false);
      })
      .finally(() => setDetailLoading(false));
  };

  const columns = [
    {
      key: 'return_no',
      label: 'Return No.',
      render: (row) => (
        <span className="purchase-history__bill-no">
          #{row.return_no}
        </span>
      ),
    },
    {
      key: 'return_date',
      label: 'Return Date',
      render: (row) => (
        row.return_date
          ? new Date(row.return_date).toLocaleDateString('en-IN')
          : '—'
      ),
    },
    {
      key: 'party_name',
      label: 'Supplier',
      render: (row) => row.party_name || '—',
    },
    {
      key: 'original_bill_no',
      label: 'Original Bill',
      render: (row) => row.original_bill_no || '—',
    },
    {
      key: 'item_names',
      label: 'Item Name',
      render: (row) => compact(row.item_names || []),
    },
    {
      key: 'hsn_codes',
      label: 'HSN Code',
      render: (row) => compact(row.hsn_codes || []),
    },
    {
      key: 'total_quantity',
      label: 'Total Qty',
      align: 'right',
      render: (row) => row.total_quantity ?? 0,
    },
    {
      key: 'return_reason',
      label: 'Reason',
      render: (row) => row.return_reason || '—',
    },
    {
      key: 'grand_total',
      label: 'Grand Total',
      align: 'right',
      render: (row) => (
        <strong>{formatCurrency(row.grand_total || 0)}</strong>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Purchase Return History"
        subtitle="View and update supplier returns. Delete is disabled to protect stock history."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search return no., original bill, or supplier..."
      />

      <DataTable
        columns={columns}
        rows={records}
        loading={loading}
        onRowClick={openDetail}
        onEdit={(row) => navigate(`/purchase-return-entry?edit=${row.id}`)}
        emptyMessage={
          search
            ? `No purchase returns match "${search}".`
            : 'No purchase returns recorded yet.'
        }
      />

      <PurchaseReturnDetailModal
        open={detailOpen}
        loading={detailLoading}
        purchaseReturn={detailData}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
