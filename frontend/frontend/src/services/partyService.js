import api from './api';

// Matches your FastAPI /parties router exactly.
// Every function returns response.data directly so pages don't deal with axios internals.

export function fetchParties({ search = '' } = {}) {
  return api
    .get('/parties/', { params: { search: search || undefined, limit: 500 } })
    .then((res) => res.data);
}

export function createParty(payload) {
  return api.post('/parties/', payload).then((res) => res.data);
}

export function updateParty(id, payload) {
  return api.put(`/parties/${id}`, payload).then((res) => res.data);
}

export function deleteParty(id) {
  return api.delete(`/parties/${id}`).then((res) => res.data);
}
