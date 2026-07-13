import api from './api';

const SALES_RETURN_ENDPOINT = '/sales-returns/';

export function fetchSalesReturns({ search = '' } = {}) {
  return api
    .get(SALES_RETURN_ENDPOINT, {
      params: { search: search || undefined, limit: 500 },
    })
    .then((res) => res.data);
}

export function fetchNextSalesReturnNumbers() {
  return api
    .get(`${SALES_RETURN_ENDPOINT}next-numbers`)
    .then((res) => res.data);
}

export function fetchSalesReturnById(id) {
  return api
    .get(`${SALES_RETURN_ENDPOINT}${id}`)
    .then((res) => res.data);
}

export function createSalesReturn(payload) {
  return api
    .post(SALES_RETURN_ENDPOINT, payload)
    .then((res) => res.data);
}

export function updateSalesReturn(id, payload) {
  return api
    .put(`${SALES_RETURN_ENDPOINT}${id}`, payload)
    .then((res) => res.data);
}
