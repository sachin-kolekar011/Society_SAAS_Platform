import axios from 'axios';

// Same-origin deploy (Phase 2): frontend and API share a host, so relative
// /api/v1 is correct in every environment without a per-tenant base URL
// config. NGINX (Phase 12) proxies this to the app container.
const axiosClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // sends the httpOnly refresh cookie automatically
});

// In-memory access token, never localStorage (Phase 2 decision - XSS
// surface). Set by AuthContext on login/refresh, read here on every request.
let accessToken = null;
let onUnauthorized = () => {}; // AuthContext registers its logout() here

export function setAccessToken(token) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

axiosClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Queues concurrent 401s behind a single in-flight refresh call, rather
// than letting every failed request trigger its own /auth/refresh -- see
// Phase 8 section 2. Without this, two requests failing in the same tick
// (common: a page firing both a list call and a details call) would race
// two refresh attempts, and the second one would find the first one's
// rotated refresh token already invalidated its own.
let refreshPromise = null;

async function performRefresh() {
  const response = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
  return response.data.data.accessToken;
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshCall = originalRequest.url?.includes('/auth/refresh');
    const isUnauthorized = error.response?.status === 401;

    if (isUnauthorized && !isRefreshCall && !originalRequest._retried) {
      originalRequest._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccessToken = await refreshPromise;
        setAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // Refresh itself failed -- this is the ONLY path that should force
        // a logout (Phase 8 §2, point 3). A single expired access token
        // should be invisible to the user.
        onUnauthorized();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
