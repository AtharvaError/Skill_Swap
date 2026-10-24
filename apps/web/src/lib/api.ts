import axios, { type InternalAxiosRequestConfig } from 'axios';

export const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

// CSRF tokens are bound to the signed-in user on the server, so the cached
// token is dropped whenever the session changes (login, signup, logout,
// refresh) and fetched again on the next state-changing request.
let csrfToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

const MAX_CSRF_RETRIES = 2;
const SESSION_CHANGING_PATHS = ['/auth/login', '/auth/signup', '/auth/logout', '/auth/refresh'];
// Pages that must stay reachable while signed out.
const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _csrfRetries?: number;
};

const changesSession = (url?: string) =>
  SESSION_CHANGING_PATHS.some((path) => url?.includes(path));

const processQueue = (error: unknown | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

async function fetchCsrfToken() {
  const response = await axios.get<{ csrfToken: string }>(`${apiBaseURL}/auth/csrf`, {
    withCredentials: true,
  });
  csrfToken = response.data.csrfToken;
  return csrfToken;
}

// Request interceptor: auto-fetch and attach CSRF token on state-changing requests
api.interceptors.request.use(
  async (config) => {
    const method = config.method?.toLowerCase();
    if (method && ['post', 'put', 'delete', 'patch'].includes(method)) {
      if (!csrfToken) {
        try {
          await fetchCsrfToken();
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
  (response) => {
    if (changesSession(response.config.url)) {
      csrfToken = null;
    }
    return response;
  },
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetriableRequestConfig;
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    const isCsrfFailure =
      error.response?.status === 403 && typeof message === 'string' && /csrf/i.test(message);

    // 1. If CSRF token validation fails, fetch a fresh token and retry the request
    if (isCsrfFailure && (originalRequest._csrfRetries ?? 0) < MAX_CSRF_RETRIES) {
      originalRequest._csrfRetries = (originalRequest._csrfRetries ?? 0) + 1;
      try {
        originalRequest.headers['X-CSRF-Token'] = await fetchCsrfToken();
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
        return new Promise<void>((resolve, reject) => {
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
      } catch (refreshError: unknown) {
        processQueue(refreshError);
        isRefreshing = false;

        // Redirect to login if token refresh fails
        if (typeof window !== 'undefined' && !PUBLIC_PATHS.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
