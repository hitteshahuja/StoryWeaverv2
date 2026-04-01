import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

// Attach Clerk JWT to every request
api.interceptors.request.use(async (config) => {
  try {
    const { getToken } = window.__clerkGetToken || {};
    if (getToken) {
      const token = await getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

/**
 * Resolve a relative path (e.g., /generated/abc.png) to a full URL.
 * If already absolute (http://... or data:...), returns as-is.
 */
export function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_BASE}${url}`;
}

export const usersAPI = {
  sync: (data) => api.post('/api/users/sync', data).then((r) => r.data),
  me: () => api.get('/api/users/me').then((r) => r.data),
  billing: () => api.get('/api/users/billing').then((r) => r.data),
  updateProfile: (data) => api.put('/api/users/profile', data).then((r) => r.data),
};

export const storiesAPI = {
  analyze: (data) => api.post('/api/stories/analyze', data).then((r) => r.data),
  generate: (data) => api.post('/api/stories/generate', data).then((r) => r.data),
  list: () => api.get('/api/stories').then((r) => r.data),
  favorites: () => api.get('/api/stories/favorites').then((r) => r.data),
  toggleFavorite: (id) => api.patch(`/api/stories/${id}/favorite`).then((r) => r.data),
  delete: (id) => api.delete(`/api/stories/${id}`).then((r) => r.data),
  suggestFilters: (data) => api.post('/api/stories/suggest-filters', data).then((r) => r.data),
  extractFeatures: (data) => api.post('/api/stories/extract-features', data).then((r) => r.data),
  refresh: (data) => api.post('/api/stories/refresh', data).then((r) => r.data),
};

export const uploadAPI = {
  upload: (file) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post('/api/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

export const booksAPI = {
  generate: (data) => api.post('/api/books/generate', data).then((r) => r.data),
  list: () => api.get('/api/books').then((r) => r.data),
  get: (id) => api.get(`/api/books/${id}`).then((r) => r.data),
  proxyImage: (url) => api.post('/api/books/proxy-image', { url }).then((r) => r.data),
  tts: (data) => api.post('/api/books/tts', data).then((r) => r.data),
};

export const stripeAPI = {
  createCheckout: (type) => api.post('/api/stripe/create-checkout', { type }).then((r) => r.data),
};

export default api;
