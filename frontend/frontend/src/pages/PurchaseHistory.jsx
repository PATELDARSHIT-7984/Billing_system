import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import PurchaseDetailModal from './PurchaseDetailModal';
import { useToast } from '../context/ToastContext';
import { fetchPurchases, fetchPurchaseById } from '../services/purchaseService';
import { extractErrorMessage } from '../services/api';
import { formatCurrency } from '../utils/calculations';
import './PurchaseHistory.css';

function renderCompactList(values, formatter = (value) => value) {
  const safeValues = Array.isArray(values) ? values : [];

  if (!safeValues.length) return <span className="purchase-history__muted">—</span>;

  const visible = safeValues.slice(0, 2);
  const remaining = safeValues.length - visible.length;

  return (
    <div className="purchase-history__list">
      {visible.map((value, index) => (
        <span key={`${value}-${index}`}>{formatter(value)}</span>
      ))}
      {remaining > 0 && (
        <span className="purchase-history__more">+{remaining} more</span>
      )}
    </div>
  );
}

export default function PurchaseHistory() {
  const toast = useToast();
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const columns = [
    {
      key: 'bill_no',
      label: 'Bill No.',
      render: (row) => <span className="purchase-history__bill-no">#{row.bill_no}</span>,
    },
    {
      key: 'bill_date',
      label: 'Bill Date',
      render: (row) => new Date(`${row.bill_date}T00:00:00`).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
    },
    { key: 'party_name', label: 'Supplier', render: (row) => row.party_name || '—' },
    {
      key: 'item_names',
      label: 'Item Name',
      render: (row) => renderCompactList(row.item_names),
    },
    {
      key: 'hsn_codes',
      label: 'HSN Code',
      render: (row) => renderCompactList(row.hsn_codes),
    },
    {
      key: 'purchase_prices',
      label: 'Purchase Price',
      align: 'right',
      render: (row) => renderCompactList(row.purchase_prices, formatCurrency),
    },
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

  const editPurchase = (row) => {
    navigate(`/purchase-entry?edit=${row.id}`);
  };

  return (
    <div className="page">
      <PageHeader
        title="Purchase History"
        subtitle="Review every purchase bill, open its complete breakdown, or update an existing entry."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by bill number, order number or supplier..."
      />

      <DataTable
        columns={columns}
        rows={purchases}
        loading={loading}
        onRowClick={openDetail}
        onEdit={editPurchase}
        emptyMessage={search ? `No purchases match "${search}".` : 'No purchases recorded yet. Create one from Purchase Entry.'}
      />

      <PurchaseDetailModal
        open={detailOpen}
        loading={detailLoading}
        purchase={detailData}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
