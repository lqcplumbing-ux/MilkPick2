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

export default api;
