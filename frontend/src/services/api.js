import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
};

// Farm APIs
export const farmAPI = {
  getAll: () => api.get('/farms'),
  getById: (id) => api.get(`/farms/${id}`),
  getMyFarm: () => api.get('/farms/my-farm'),
  create: (data) => api.post('/farms', data),
  update: (id, data) => api.put(`/farms/${id}`, data),
  delete: (id) => api.delete(`/farms/${id}`),
};

// Product APIs
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByFarm: (farmId) => api.get(`/products/farm/${farmId}`),
  getMyProducts: () => api.get('/products/my-products'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/products/${id}/image`, formData);
  },
  toggleAvailability: (id) => api.patch(`/products/${id}/toggle`),
  delete: (id) => api.delete(`/products/${id}`),
};

// Inventory APIs
export const inventoryAPI = {
  upsert: (data) => api.post('/inventory', data),
  getMyInventory: (params) => api.get('/inventory/my-farm', { params }),
  getByFarm: (farmId, params) => api.get(`/inventory/farm/${farmId}`, { params }),
  getHistory: (params) => api.get('/inventory/history', { params }),
  getLowStock: (params) => api.get('/inventory/low-stock', { params }),
};

// Subscription APIs
export const subscriptionAPI = {
  create: (data) => api.post('/subscriptions', data),
  getMySubscriptions: () => api.get('/subscriptions'),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  cancel: (id) => api.delete(`/subscriptions/${id}`),
  preview: (params) => api.get('/subscriptions/preview', { params })
};

// Orders APIs
export const orderAPI = {
  getMyOrders: (params) => api.get('/orders', { params }),
  getUpcoming: () => api.get('/orders/upcoming'),
  update: (id, data) => api.put(`/orders/${id}`, data),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  getQr: (id) => api.get(`/orders/${id}/qr`),
  selfConfirm: (id) => api.post(`/orders/${id}/self-confirm`)
};

// Farmer Orders APIs
export const farmerOrderAPI = {
  getFarmOrders: (params) => api.get('/orders/farm', { params }),
  getStats: (params) => api.get('/orders/farm/stats', { params }),
  confirmPickup: (id) => api.post(`/orders/${id}/confirm`),
  scanQr: (data) => api.post('/orders/scan', data)
};

// Payments APIs
export const paymentAPI = {
  createSetupIntent: () => api.post('/payments/setup-intent'),
  storePaymentMethod: (data) => api.post('/payments/methods', data),
  getMethods: () => api.get('/payments/methods'),
  setDefaultMethod: (id) => api.post(`/payments/methods/${id}/default`),
  removeMethod: (id) => api.delete(`/payments/methods/${id}`),
  getHistory: () => api.get('/payments/history'),
  payOrder: (id) => api.post(`/payments/orders/${id}/pay`),
  refundOrder: (id) => api.post(`/payments/orders/${id}/refund`),
  connectOnboard: () => api.post('/payments/connect/onboard'),
  connectStatus: () => api.get('/payments/connect/status'),
  getFarmTransactions: () => api.get('/payments/farm/transactions')
};

// Notifications APIs
export const notificationAPI = {
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data) => api.put('/notifications/preferences', data),
  getNotifications: (params) => api.get('/notifications', { params })
};

export default api;
