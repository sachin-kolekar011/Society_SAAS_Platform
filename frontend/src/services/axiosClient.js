// import axios from 'axios';

// // Derives the API base URL from the CURRENT hostname rather than assuming
// // same-origin (Phase 2's production assumption, where NGINX puts frontend
// // and API behind one origin). Locally, without NGINX in front, the Vite
// // dev server (5173) and the API (4000) are genuinely different origins --
// // this was found and fixed during real local testing on Windows, where the
// // original same-origin/proxy assumption didn't hold outside of a
// // docker-compose+NGINX setup. In production this file doesn't matter: NGINX
// // makes both same-origin again, so getApiBaseUrl's tenant-prefixed branch
// // and the same-origin branch resolve to the same place either way.
// function getApiBaseUrl() {
//   const hostname = window.location.hostname;
//   const apiPort = 4000; // backend's dev port -- see backend/src/config/env.js PORT default

//   if (hostname === 'localhost' || hostname === '127.0.0.1') {
//     // No tenant subdomain -- this is either local super-admin access
//     // (Platform Core, tenant-less by design) or a developer hitting the
//     // API directly without a society context.
//     return `http://localhost:${apiPort}/api/v1`;
//   }

//   // greenvalley.localhost:5173 -> greenvalley.localhost:4000/api/v1
//   // Keeps the SAME hostname (not just the tenant slug) so this also works
//   // unmodified once a real domain replaces .localhost/.nip.io -- only the
//   // port changes between frontend and API, never the tenant-identifying
//   // part of the hostname.
//   return `http://${hostname}:${apiPort}/api/v1`;
// }

// const axiosClient = axios.create({
//   baseURL: getApiBaseUrl(),
//   withCredentials: true, // sends the httpOnly refresh cookie automatically -- cookies aren't port-scoped, so this still works across the 5173/4000 split
// });

// // In-memory access token, never localStorage (Phase 2 decision - XSS
// // surface). Set by AuthContext on login/refresh, read here on every request.
// let accessToken = null;
// let onUnauthorized = () => {}; // AuthContext registers its logout() here

// export function setAccessToken(token) {
//   accessToken = token;
// }

// export function setUnauthorizedHandler(handler) {
//   onUnauthorized = handler;
// }

// axiosClient.interceptors.request.use((config) => {
//   if (accessToken) {
//     config.headers.Authorization = `Bearer ${accessToken}`;
//   }
//   return config;
// });

// // Queues concurrent 401s behind a single in-flight refresh call, rather
// // than letting every failed request trigger its own /auth/refresh -- see
// // Phase 8 section 2. Without this, two requests failing in the same tick
// // (common: a page firing both a list call and a details call) would race
// // two refresh attempts, and the second one would find the first one's
// // rotated refresh token already invalidated its own.
// let refreshPromise = null;

// async function performRefresh() {
//   const response = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {}, { withCredentials: true });
//   return response.data.data.accessToken;
// }

// axiosClient.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
//     const isRefreshCall = originalRequest.url?.includes('/auth/refresh');
//     const isUnauthorized = error.response?.status === 401;

//     if (isUnauthorized && !isRefreshCall && !originalRequest._retried) {
//       originalRequest._retried = true;
//       try {
//         if (!refreshPromise) {
//           refreshPromise = performRefresh().finally(() => {
//             refreshPromise = null;
//           });
//         }
//         const newAccessToken = await refreshPromise;
//         setAccessToken(newAccessToken);
//         originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
//         return axiosClient(originalRequest);
//       } catch (refreshError) {
//         // Refresh itself failed -- this is the ONLY path that should force
//         // a logout (Phase 8 §2, point 3). A single expired access token
//         // should be invisible to the user.
//         onUnauthorized();
//         return Promise.reject(refreshError);
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default axiosClient;



import axios from 'axios';

// Derives the API base URL from the CURRENT hostname rather than assuming
// same-origin (Phase 2's production assumption, where NGINX puts frontend
// and API behind one origin). Locally, without NGINX in front, the Vite
// dev server (5173) and the API (4000) are genuinely different origins --
// this was found and fixed during real local testing on Windows, where the
// original same-origin/proxy assumption didn't hold outside of a
// docker-compose+NGINX setup. In production this file doesn't matter: NGINX
// makes both same-origin again, so getApiBaseUrl's tenant-prefixed branch
// and the same-origin branch resolve to the same place either way.
function getApiBaseUrl() {
  // import.meta.env.DEV is true only under `vite dev` (local development),
  // false in a production build (`vite build`, which is what actually gets
  // deployed via Docker/NGINX). This is the correct switch point -- found
  // and fixed BEFORE deployment, not after: the hostname-based direct-port
  // approach below is only valid locally, where there's no NGINX in front.
  // In production, docker-compose deliberately never exposes port 4000 to
  // the internet at all (see docker-compose.yml's `expose:` vs `ports:`) --
  // NGINX is the only reachable port, and it proxies /api/v1 internally to
  // the app container. Same-origin relative '/api/v1' is what actually
  // reaches the API in that setup.
  if (import.meta.env.DEV) {
    const hostname = window.location.hostname;
    const apiPort = 4000; // backend's dev port -- see backend/src/config/env.js PORT default

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // No tenant subdomain -- this is either local super-admin access
      // (Platform Core, tenant-less by design) or a developer hitting the
      // API directly without a society context.
      return `http://localhost:${apiPort}/api/v1`;
    }

    // greenvalley.localhost:5173 -> greenvalley.localhost:4000/api/v1
    return `http://${hostname}:${apiPort}/api/v1`;
  }

  return '/api/v1';
}

const axiosClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // sends the httpOnly refresh cookie automatically -- cookies aren't port-scoped, so this still works across the 5173/4000 split
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
  const response = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {}, { withCredentials: true });
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