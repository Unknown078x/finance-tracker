import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({ baseURL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_tracker_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('finance_tracker_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Pulls a readable message out of the API's error shape, falling back
// gracefully for network failures.
export function apiErrorMessage(err) {
  if (err.response?.data?.fields) {
    return Object.values(err.response.data.fields).join(' · ');
  }
  return err.response?.data?.error || 'Something went wrong. Please try again.';
}

export default client;
