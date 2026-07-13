import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import SalesReturnDetailModal from './SalesReturnDetailModal';
import { useToast } from '../context/ToastContext';
import {
  fetchSalesReturnById,
  fetchSalesReturns,
} from '../services/salesReturnService';
import { extractErrorMessage } from '../services/api';
import { formatCurrency } from '../utils/calculations';
import './PurchaseHistory.css';

function compactValues(values = [], fallback = '—') {
  const cleaned = values.filter(
    (value) => value !== null && value !== undefined && value !== '',
  );

  if (!cleaned.length) return fallback;
  if (cleaned.length === 1) return String(cleaned[0]);

  return `${cleaned[0]} (+${cleaned.length - 1} more)`;
}

export default function SalesReturnHistory() {
  const toast = useToast();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRecords = useCallback((searchTerm) => {
    setLoading(true);

    fetchSalesReturns({ search: searchTerm })
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
    setDetailLoading(true);
    setDetailOpen(true);

    fetchSalesReturnById(row.id)
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
          ? new Date(row.return_date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—'
      ),
    },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (row) => row.customer_name || '—',
    },
    {
      key: 'original_invoice_no',
      label: 'Original Invoice',
      render: (row) => row.original_invoice_no || '—',
    },
    {
      key: 'item_name',
      label: 'Item Name',
      render: (row) => compactValues(row.item_names || []),
    },
    {
      key: 'hsn_code',
      label: 'HSN Code',
      render: (row) => compactValues(row.hsn_codes || []),
    },
    {
      key: 'total_boxes',
      label: 'Total Boxes',
      align: 'right',
      render: (row) => row.total_boxes ?? 0,
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
        title="Sales Return History"
        subtitle="View and update sales returns. Delete is disabled to protect stock history."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by return no., invoice, or customer..."
      />

      <DataTable
        columns={columns}
        rows={records}
        loading={loading}
        onRowClick={openDetail}
        onEdit={(row) => navigate(`/sales-return-entry?edit=${row.id}`)}
        emptyMessage={
          search
            ? `No sales returns match "${search}".`
            : 'No sales returns recorded yet.'
        }
      />

      <SalesReturnDetailModal
        open={detailOpen}
        loading={detailLoading}
        salesReturn={detailData}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
