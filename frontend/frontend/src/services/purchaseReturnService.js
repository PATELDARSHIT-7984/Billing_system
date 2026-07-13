import api from './api';

const ENDPOINT = '/purchase-returns/';

export function fetchPurchaseReturns({ search = '' } = {}) {
  return api
    .get(ENDPOINT, {
      params: { search: search || undefined, limit: 500 },
    })
    .then((res) => res.data);
}

export function fetchNextPurchaseReturnNumbers() {
  return api.get(`${ENDPOINT}next-numbers`).then((res) => res.data);
}

export function fetchPurchaseReturnById(id) {
  return api.get(`${ENDPOINT}${id}`).then((res) => res.data);
}

export function createPurchaseReturn(payload) {
  return api.post(ENDPOINT, payload).then((res) => res.data);
}

export function updatePurchaseReturn(id, payload) {
  return api.put(`${ENDPOINT}${id}`, payload).then((res) => res.data);
}
