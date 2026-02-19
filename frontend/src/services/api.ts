import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),

  login: (username: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),

  getCurrentUser: () => api.get('/auth/me'),
};

// Stocks API
export const stocksAPI = {
  getQuote: (symbol: string) => api.get(`/stocks/quote/${symbol}`),

  getDetail: (symbol: string) => api.get(`/stocks/detail/${symbol}`),

  search: (query: string) => api.get('/stocks/search', { params: { q: query } }),

  getHistorical: (symbol: string, days: number = 30) =>
    api.get(`/stocks/historical/${symbol}`, { params: { days } }),

  getIndexes: () => api.get('/stocks/indexes'),
};

// Alerts API
export const alertsAPI = {
  create: (alertData: any) => api.post('/alerts', alertData),

  getAll: (params?: { status?: string; symbol?: string }) =>
    api.get('/alerts', { params }),

  getById: (id: number) => api.get(`/alerts/${id}`),

  update: (id: number, data: any) => api.put(`/alerts/${id}`, data),

  delete: (id: number) => api.delete(`/alerts/${id}`),

  check: () => api.post('/alerts/check'),
};

// Sectors API
export const sectorsAPI = {
  getAll: () => api.get('/sectors'),

  getById: (id: number) => api.get(`/sectors/${id}`),

  create: (data: { name: string; color?: string; icon?: string }) =>
    api.post('/sectors', data),

  update: (id: number, data: { name?: string; color?: string; icon?: string }) =>
    api.put(`/sectors/${id}`, data),

  delete: (id: number) => api.delete(`/sectors/${id}`),

  addStock: (sectorId: number, data: { symbol: string; stock_name?: string }) =>
    api.post(`/sectors/${sectorId}/stocks`, data),

  removeStock: (sectorId: number, symbol: string) =>
    api.delete(`/sectors/${sectorId}/stocks/${symbol}`),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params?: { unread_only?: boolean; limit?: number; offset?: number }) =>
    api.get('/notifications', { params }),

  getUnreadCount: () => api.get('/notifications/unread-count'),

  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export default api;
