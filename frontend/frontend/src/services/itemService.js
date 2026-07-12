import api from './api';

// =================== Item Master API (/item-master) ===================
const ITEM_MASTER_ENDPOINT = '/item-master/';

// List includes hsn_code/unit/sale_price/gst_rate/current_stock -- enough
// for Purchase Entry and Sales Entry's item dropdowns. It does NOT include
// mrp, description, or purchase/sale dates; use fetchItemById for those.
export function fetchItems({ search = '' } = {}) {
  return api
    .get(ITEM_MASTER_ENDPOINT, { params: { search: search || undefined, limit: 500 } })
    .then((res) => res.data.filter((item) => item.is_active !== false));
}

export function fetchItemById(id) {
  return api.get(`${ITEM_MASTER_ENDPOINT}${id}`).then((res) => res.data);
}

export function createItem(payload) {
  return api.post(ITEM_MASTER_ENDPOINT, payload).then((res) => res.data);
}

// update_item() overwrites every field -- always submit the full object.
export function updateItem(id, payload) {
  return api.put(`${ITEM_MASTER_ENDPOINT}${id}`, payload).then((res) => res.data);
}

export function deleteItem(id) {
  return api.delete(`${ITEM_MASTER_ENDPOINT}${id}`).then((res) => res.data);
}
