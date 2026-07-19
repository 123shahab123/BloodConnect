import axios, { type AxiosInstance } from 'axios';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token storage ──────────────────────────────────────────────────────────
const TOKEN_KEY = 'bc_token';
const ADMIN_TOKEN_KEY = 'bc_admin_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),

  getAdmin: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  setAdmin: (t: string) => localStorage.setItem(ADMIN_TOKEN_KEY, t),
  clearAdmin: () => localStorage.removeItem(ADMIN_TOKEN_KEY),
};

// ─── Request interceptor — attach bearer token ─────────────────────────────
api.interceptors.request.use((config) => {
  const isAdmin = config.url?.startsWith('/admin') && !config.url?.includes('/admin/login');
  const token = isAdmin ? tokenStorage.getAdmin() : tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — try one silent token refresh on 401 ───────────
let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAdminRoute = original?.url?.startsWith('/admin');

    if (error.response?.status === 401 && !original._retry && !isAdminRoute) {
      const token = tokenStorage.get();
      if (!token) {
        tokenStorage.clear();
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push(() => resolve(api(original)));
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const newToken = data.data.access_token;
        tokenStorage.set(newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        queue.forEach((cb) => cb());
        queue = [];
        return api(original);
      } catch {
        tokenStorage.clear();
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401 && isAdminRoute) {
      tokenStorage.clearAdmin();
      window.dispatchEvent(new Event('admin:logout'));
    }

    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  login:    (phone: string, password: string) => api.post('/auth/login', { phone, password }),
  logout:   () => api.post('/auth/logout'),
  refresh:  () => api.post('/auth/refresh'),
};

// ─── User ───────────────────────────────────────────────────────────────────
export const userApi = {
  getMe:              () => api.get('/user'),
  updateMe:           (data: Record<string, unknown>) => api.put('/user', data),
  changePassword:     (data: Record<string, unknown>) => api.patch('/user/password', data),
  updateAvailability: (is_available: boolean) => api.patch('/user/availability', { is_available }),
  updateFcmToken:     (token: string | null) => api.patch('/user/fcm-token', { token }),
  getDonationHistory: (params?: Record<string, unknown>) => api.get('/user/donation-history', { params }),
  getProvinces:       () => api.get('/geo/provinces'),
  getDistricts:       (provinceId: number) => api.get(`/geo/districts/${provinceId}`),
};

// ─── Blood Requests ─────────────────────────────────────────────────────────
export const requestApi = {
  create:         (data: Record<string, unknown>) => api.post('/requests', data),
  getMyList:      (params?: Record<string, unknown>) => api.get('/requests/my', { params }),
  getById:        (id: number) => api.get(`/requests/${id}`),
  getAcceptances: (id: number) => api.get(`/requests/${id}/acceptances`),
  fulfill:        (id: number) => api.patch(`/requests/${id}/fulfill`),
  cancel:         (id: number, reason?: string) => api.patch(`/requests/${id}/cancel`, { reason }),
};

// ─── Notifications ──────────────────────────────────────────────────────────
export const notifApi = {
  getIncoming:     () => api.get('/notifications/incoming'),
  getInApp:        (params?: Record<string, unknown>) => api.get('/notifications/inbox', { params }),
  markAllRead:     () => api.patch('/notifications/inbox/read-all'),
  getNotifRequest: (notifId: number) => api.get(`/notifications/${notifId}/detail`),
  respond:         (notifId: number, response: 'accepted' | 'declined') =>
                     api.post(`/notifications/${notifId}/respond`, { response }),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  login:        (email: string, password: string) => api.post('/admin/login', { email, password }),
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers:     (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  getUserById:  (id: number) => api.get(`/admin/users/${id}`),
  suspendUser:  (id: number, days: number, reason: string) => api.patch(`/admin/users/${id}/suspend`, { days, reason }),
  unsuspendUser:(id: number) => api.patch(`/admin/users/${id}/unsuspend`),
  banUser:      (id: number, reason: string) => api.patch(`/admin/users/${id}/ban`, { reason }),
  verifyDonor:  (id: number, verified: boolean) => api.patch(`/admin/users/${id}/verify`, { verified }),
  getRequests:  (params?: Record<string, unknown>) => api.get('/admin/requests', { params }),
  escalateReq:  (id: number, wave: number) => api.post(`/admin/requests/${id}/escalate`, { wave }),
  cancelReq:    (id: number, reason: string) => api.patch(`/admin/requests/${id}/cancel`, { reason }),
  getAnalytics: (period?: string) => api.get('/admin/analytics', { params: { period } }),
  getConfig:    () => api.get('/admin/config'),
  updateConfig: (updates: Record<string, string>) => api.put('/admin/config', { updates }),
  broadcast:    (data: Record<string, unknown>) => api.post('/admin/broadcast', data),
};

export default api;
