import api from './api';

// Confirmed against your purchase_router.py (prefix="/purchases").
const PURCHASES_ENDPOINT = '/purchases/';

// GET /purchases/ -> list[PurchaseListResponse] (used by Purchase History)
export function fetchPurchases({ search = '' } = {}) {
  return api
    .get(PURCHASES_ENDPOINT, { params: { search: search || undefined, limit: 500 } })
    .then((res) => res.data);
}

// GET /purchases/{id} -> PurchaseResponse (full bill incl. items)
export function fetchPurchaseById(id) {
  return api.get(`${PURCHASES_ENDPOINT}${id}`).then((res) => res.data);
}

// Payload matches PurchaseCreate. Purchase bill_no and order_no are entered manually.
export function createPurchase(payload) {
  return api.post(PURCHASES_ENDPOINT, payload).then((res) => res.data);
}

// payload shape matches PurchaseUpdate exactly
export function updatePurchase(id, payload) {
  return api.put(`${PURCHASES_ENDPOINT}${id}`, payload).then((res) => res.data);
}

export function deletePurchase(id) {
  return api.delete(`${PURCHASES_ENDPOINT}${id}`).then((res) => res.data);
}
