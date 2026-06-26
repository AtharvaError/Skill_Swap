import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

let csrfToken: string | null = null;
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Request interceptor: auto-fetch and attach CSRF token on state-changing requests
api.interceptors.request.use(
  async (config) => {
    const method = config.method?.toLowerCase();
    if (method && ['post', 'put', 'delete', 'patch'].includes(method)) {
      if (!csrfToken) {
        try {
          const response = await axios.get(`${baseURL}/auth/csrf`, {
            withCredentials: true,
          });
          csrfToken = response.data.csrfToken;
        } catch (err) {
          console.error('Failed to pre-fetch CSRF token:', err);
        }
      }
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle token refresh and CSRF retries
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. If CSRF token validation fails (403), fetch a new one and retry the request once
    if (error.response?.status === 403 && !originalRequest._retryCsrf) {
      originalRequest._retryCsrf = true;
      try {
        const response = await axios.get(`${baseURL}/auth/csrf`, {
          withCredentials: true,
        });
        csrfToken = response.data.csrfToken;
        if (csrfToken) {
          originalRequest.headers['X-CSRF-Token'] = csrfToken;
        }
        return api(originalRequest);
      } catch (csrfErr) {
        return Promise.reject(csrfErr);
      }
    }

    // 2. If access token expires (401), perform silent refresh and retry the request
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh for auth-specific requests that are meant to fail on auth
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/signup')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        // Redirect to login if token refresh fails
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
