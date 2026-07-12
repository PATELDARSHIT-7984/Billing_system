import axios from 'axios';
import { API_BASE_URL } from '../config/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Normalizes FastAPI error shapes ({detail: "..."} or {detail: [{msg: ...}]})
// into a single readable string so every page can show it the same way.
export function extractErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (!detail) {
    if (error?.message === 'Network Error') {
      return 'Cannot reach the server. Please check your connection or try again.';
    }
    return error?.message || 'Something went wrong. Please try again.';
  }

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === 'string' ? d : d.msg))
      .filter(Boolean)
      .join(', ');
  }

  return 'Something went wrong. Please try again.';
}

export default api;
