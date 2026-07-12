import api from './api';

// ======================= Bills API (/bill) =======================
const BILL_ENDPOINT = '/bill/';

// List rows (BillListResponse) -- used by Bill History's table.
export function fetchBills({ search = '' } = {}) {
  return api
    .get(BILL_ENDPOINT, { params: { search: search || undefined, limit: 500 } })
    .then((res) => res.data);
}

// The only endpoint that returns line items ({ bill, items }) -- used for
// the detail modal, PDF generation, and right after Save in Sales Entry.
export function fetchBillById(id) {
  return api.get(`${BILL_ENDPOINT}${id}`).then((res) => res.data);
}

// Payload: { customer_id, bill_date, is_interstate, remarks, items: [{ item_id, quantity }] }.
// Sale price and GST % always come from Item Master server-side -- there is
// no field here for a custom/edited price (see SalesEntry.jsx).
export function createBill(payload) {
  return api.post(BILL_ENDPOINT, payload).then((res) => res.data);
}

export function updateBill(id, payload) {
  return api.put(`${BILL_ENDPOINT}${id}`, payload).then((res) => res.data);
}

// Soft delete -- restores the stock this bill had deducted.
export function deleteBill(id) {
  return api.delete(`${BILL_ENDPOINT}${id}`).then((res) => res.data);
}
