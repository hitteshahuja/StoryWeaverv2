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
  } catch { /* ignore auth errors */ }
  return config;
});

/**
 * Resolve a relative path (e.g., /generated/abc.png) to a full URL.
 * If already absolute (http://... or data:...), returns as-is.
 */
const R2_PUBLIC_URL = 'https://pub-0987838aa0464685959b319d5c0698f7.r2.dev';

export function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_BASE}${url}`;
}

export async function resolveImageUrl(url) {
  if (!url) return url;
  if (url.startsWith('data:')) return url;
  if (url.startsWith(R2_PUBLIC_URL)) {
    const result = await api.post('/api/books/proxy-image', { url }).then((r) => r.data);
    return result.data;
  }
  if (url.startsWith('http')) return url;
  return url;
}

export const usersAPI = {
  sync: (data) => api.post('/api/users/sync', data).then((r) => r.data),
  me: () => api.get('/api/users/me').then((r) => r.data),
  billing: () => api.get('/api/users/billing').then((r) => r.data),
  updateProfile: (data) => api.put('/api/users/profile', data).then((r) => r.data),
  consent: (data) => api.post('/api/users/consent', data).then((r) => r.data),
  purchaseFont: (fontId) => api.post('/api/users/purchase-font', { fontId }).then((r) => r.data),
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
  list: (page = 1, limit = 10) => api.get(`/api/books?page=${page}&limit=${limit}`).then((r) => r.data),
  favorites: (page = 1, limit = 10) => api.get(`/api/books/favorites?page=${page}&limit=${limit}`).then((r) => r.data),
  get: (id) => api.get(`/api/books/${id}`).then((r) => r.data),
  getFonts: () => api.get('/api/books/fonts').then((r) => r.data),
  toggleFavorite: (id) => api.patch(`/api/books/${id}/favorite`).then((r) => r.data),
  related: (id) => api.post(`/api/books/${id}/related`).then((r) => r.data),
  proxyImage: (url) => api.post('/api/books/proxy-image', { url }).then((r) => r.data),
  tts: (data) => api.post('/api/books/tts', data).then((r) => r.data),
  analyze: (data) => api.post('/api/books/analyze', data).then((r) => r.data),
  suggestFilters: (data) => api.post('/api/books/suggest-filters', data).then((r) => r.data),
  extractFeatures: (data) => api.post('/api/books/extract-features', data).then((r) => r.data),
  refresh: (data) => api.post('/api/books/refresh', data).then((r) => r.data),
  refreshImage: (bookId, pageNumber, customPrompt) => api.post(`/api/books/${bookId}/refresh-image`, { pageNumber, customPrompt }).then((r) => r.data),
};

export const stripeAPI = {
  createCheckout: (type) => api.post('/api/stripe/create-checkout', { type }).then((r) => r.data),
  createPortal: () => api.post('/api/stripe/create-subscription-portal').then((r) => r.data),
  cancelSubscription: () => api.post('/api/stripe/cancel-subscription').then((r) => r.data),
  reactivateSubscription: () => api.post('/api/stripe/reactivate-subscription').then((r) => r.data),
  getSubscriptionStatus: () => api.get('/api/stripe/subscription-status').then((r) => r.data),
};

export const adminAPI = {
  verify: () => api.get('/api/admin/verify').then((r) => r.data),
  searchUsers: (query, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page, limit });
    if (query) params.append('search', query);
    return api.get(`/api/admin/users?${params}`).then((r) => r.data);
  },
  adjustCredits: (userId, amount, reason) => api.post(`/api/admin/users/${userId}/credits`, { amount, reason }).then((r) => r.data),
  getAuditLog: (page = 1, limit = 50, userId = null) => {
    const params = new URLSearchParams({ page, limit });
    if (userId) params.append('userId', userId);
    return api.get(`/api/admin/audit-log?${params}`).then((r) => r.data);
  },
};

export default api;
