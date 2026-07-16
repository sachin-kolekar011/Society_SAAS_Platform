import axios from 'axios';

// Super Admin is platform-wide, not tenant-scoped (Phase 6 §3) -- it's
// meant to be accessed via plain localhost (or your bare domain in
// production), never through a tenant subdomain. A separate axios
// instance with its own token, rather than reusing the tenant
// axiosClient's accessToken, is deliberate: mixing the two would risk a
// tenant admin's token being sent on a super-admin request or vice versa.
const superAdminClient = axios.create({
  baseURL: 'http://localhost:4000/api/v1/super-admin',
  withCredentials: true,
});

let superAdminToken = null;

export function setSuperAdminToken(token) {
  superAdminToken = token;
}

export function getSuperAdminToken() {
  return superAdminToken;
}

superAdminClient.interceptors.request.use((config) => {
  if (superAdminToken) {
    config.headers.Authorization = `Bearer ${superAdminToken}`;
  }
  return config;
});

export const superAdminApi = {
  login: (email, password) => superAdminClient.post('/auth/login', { email, password }),
  listTenants: (params) => superAdminClient.get('/tenants', { params }),
  createTenant: (payload) => superAdminClient.post('/tenants', payload),
  setTenantStatus: (id, isActive) => superAdminClient.patch(`/tenants/${id}/status`, { isActive }),
};
