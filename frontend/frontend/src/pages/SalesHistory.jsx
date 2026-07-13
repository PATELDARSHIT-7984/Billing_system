import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import BillDetailModal from './BillDetailModal';
import { useToast } from '../context/ToastContext';
import { useCompany } from '../context/CompanyContext';
import { fetchBills, fetchBillById } from '../services/billService';
import { extractErrorMessage } from '../services/api';
import { formatCurrency } from '../utils/calculations';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import './PurchaseHistory.css';

function compactValues(values = [], fallback = '—') {
  const cleaned = values.filter(
    (value) => value !== null && value !== undefined && value !== '',
  );

  if (!cleaned.length) return fallback;
  if (cleaned.length === 1) return String(cleaned[0]);

  return `${cleaned[0]} (+${cleaned.length - 1} more)`;
}

export default function SalesHistory() {
  const toast = useToast();
  const navigate = useNavigate();
  const { company } = useCompany();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadBills = useCallback((searchTerm) => {
    setLoading(true);

    fetchBills({ search: searchTerm })
      .then(setBills)
      .catch((error) => toast.error(extractErrorMessage(error)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadBills('');
  }, [loadBills]);

  useEffect(() => {
    const timer = setTimeout(() => loadBills(search), 350);
    return () => clearTimeout(timer);
  }, [search, loadBills]);

  const openDetail = (row) => {
    const id = row.bill_id ?? row.id;

    setDetailLoading(true);
    setDetailOpen(true);

    fetchBillById(id)
      .then(setDetailData)
      .catch((error) => {
        toast.error(extractErrorMessage(error));
        setDetailOpen(false);
      })
      .finally(() => setDetailLoading(false));
  };

  const handleDownload = (row, event) => {
    event.stopPropagation();
    const id = row.bill_id ?? row.id;

    setDownloadingId(id);

    fetchBillById(id)
      .then((detail) => downloadInvoicePDF(detail, company))
      .catch((error) => toast.error(extractErrorMessage(error)))
      .finally(() => setDownloadingId(null));
  };

  const handleEdit = (row) => {
    const id = row.bill_id ?? row.id;
    navigate(`/sales-entry?edit=${id}`);
  };

  const columns = [
    {
      key: 'invoice_no',
      label: 'Invoice No.',
      render: (row) => (
        <span className="purchase-history__bill-no">
          #{row.invoice_no}
        </span>
      ),
    },
    {
      key: 'bill_date',
      label: 'Bill Date',
      render: (row) => (
        row.bill_date
          ? new Date(row.bill_date).toLocaleDateString('en-IN', {
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
      render: (row) => row.customer_name || row.party_name || '—',
    },
    {
      key: 'item_name',
      label: 'Item Name',
      render: (row) => compactValues(
        row.item_names
        || row.items?.map((item) => item.item_name)
        || [],
      ),
    },
    {
      key: 'hsn_code',
      label: 'HSN Code',
      render: (row) => compactValues(
        row.hsn_codes
        || row.items?.map((item) => item.hsn_code)
        || [],
      ),
    },
    {
      key: 'total_boxes',
      label: 'Total Boxes',
      align: 'right',
      render: (row) => row.total_boxes ?? row.item_count ?? 0,
    },
    {
      key: 'grand_total',
      label: 'Grand Total',
      align: 'right',
      render: (row) => <strong>{formatCurrency(row.grand_total || 0)}</strong>,
    },
    {
      key: 'invoice',
      label: 'Invoice',
      width: 80,
      render: (row) => {
        const id = row.bill_id ?? row.id;

        return (
          <button
            type="button"
            className="data-table__action-btn"
            onClick={(event) => handleDownload(row, event)}
            disabled={downloadingId === id}
            title="Download invoice"
            aria-label="Download invoice"
          >
            {downloadingId === id ? '...' : '⬇'}
          </button>
        );
      },
    },
  ];

  const rows = bills.map((row) => ({
    ...row,
    id: row.id ?? row.bill_id,
  }));

  return (
    <div className="page">
      <PageHeader
        title="Sales History"
        subtitle="View every sales invoice, open its details, or update it."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by invoice number or customer..."
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={openDetail}
        onEdit={handleEdit}
        emptyMessage={
          search
            ? `No sales match "${search}".`
            : 'No sales recorded yet. Create one from Sales Entry.'
        }
      />

      <BillDetailModal
        open={detailOpen}
        loading={detailLoading}
        billDetail={detailData}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
