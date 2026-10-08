import axios from 'axios';

export const TOKEN_KEY = 'sevasetu_token';
export const UNAUTHORIZED_EVENT = 'sevasetu:unauthorized';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired or revoked token ends the session everywhere.
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

/** Turns an axios error into a sentence we can show to people. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const body = error?.response?.data;

  if (body?.errors?.length) {
    return body.errors
      .map((item) => item.msg || item.message)
      .filter(Boolean)
      .join(' ');
  }
  if (body?.message) return body.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (error?.message === 'Network Error') return 'We couldn’t reach the server. Check your connection.';
  return fallback;
}

export default api;
