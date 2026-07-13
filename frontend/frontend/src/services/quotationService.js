import api from './api';

const QUOTATION_ENDPOINT = '/quotations/';

export function fetchQuotations({ search = '' } = {}) {
  return api.get(QUOTATION_ENDPOINT, {
    params: { search: search || undefined, limit: 500 },
  }).then((res) => res.data);
}

export function fetchQuotationById(id) {
  return api.get(`${QUOTATION_ENDPOINT}${id}`).then((res) => res.data);
}

export function createQuotation(payload) {
  return api.post(QUOTATION_ENDPOINT, payload).then((res) => res.data);
}

export function updateQuotation(id, payload) {
  return api.put(`${QUOTATION_ENDPOINT}${id}`, payload).then((res) => res.data);
}

export function deleteQuotation(id) {
  return api.delete(`${QUOTATION_ENDPOINT}${id}`).then((res) => res.data);
}
