import axios from 'axios';
import { auth } from './firebase';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '') + '/api';

export const api = axios.create({ baseURL: API_BASE, timeout: 60000 });

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  r => r,
  e => {
    const detail = e?.response?.data?.detail || e?.message || 'Network error';
    e.friendly = typeof detail === 'string' ? detail : JSON.stringify(detail);
    return Promise.reject(e);
  },
);
