// src/lib/api/interceptors.ts
// The backend uses HTTP-only cookies for auth (access_token + refresh_token).
// withCredentials: true on the client ensures cookies are sent automatically.
// On 401: POST /auth/refresh to rotate the refresh cookie, then retry the original request.
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Track whether a refresh is already in flight to prevent concurrent retries
let isRefreshing = false;
// Queue of requests waiting for the refresh to complete
let failedQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

function isAuthPage(): boolean {
  const path = window.location.pathname;
  return path.startsWith('/login') || path.startsWith('/register');
}

function processQueue(error: unknown): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
}

export function applyInterceptors(client: AxiosInstance): void {
  // RESPONSE interceptor — catch 401, attempt token refresh via cookie, retry original request
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Only handle 401 errors; pass everything else through unchanged
      if (error.response?.status !== 401) {
        return Promise.reject(error);
      }

      // If this request already retried once, do not loop — redirect to login
      if (originalRequest._retry) {
        if (!isAuthPage()) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // Skip refresh for auth endpoints to avoid infinite loops
      const url = originalRequest.url ?? '';
      if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      // If a refresh is already in progress, queue this request and wait
      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => client(originalRequest));
      }

      // Mark this request so it won't retry again
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // POST /auth/refresh — the refresh_token HTTP-only cookie is sent automatically
        // via withCredentials. The backend rotates both cookies.
        await client.post('/auth/refresh');
        processQueue(null);

        // Retry the original failed request — the new access_token cookie is now set
        return client(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear cookies handled server-side, redirect to login
        processQueue(refreshError);
        if (!isAuthPage()) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
}


