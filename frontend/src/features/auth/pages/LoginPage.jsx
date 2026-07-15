import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTenantTheme } from '../../../hooks/useTenantTheme';
import axiosClient from '../../../services/axiosClient';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { ROLES } from '../../../constants/roles';

// Every role lands somewhere it actually has access to -- WATCHMAN and
// MAINTENANCE_STAFF don't have /dashboard (ADMIN-only), so sending them
// there would immediately hit ProtectedRoute's 403 page right after
// logging in. Found while wiring the new role-gated routes.
const POST_LOGIN_ROUTE = {
  [ROLES.ADMIN]: '/dashboard',
  [ROLES.RESIDENT]: '/complaints',
  [ROLES.WATCHMAN]: '/gate/scan',
  [ROLES.MAINTENANCE_STAFF]: '/notices', // only role with no complaint-list access (Phase 6 RBAC matrix) -- Notices is the one MVP screen they can actually read
};

export default function LoginPage() {
  const { login, setTenant } = useAuth();
  const navigate = useNavigate();
  const [tenantInfo, setTenantInfo] = useState(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useTenantTheme(tenantInfo);

  useEffect(() => {
    // Public, unauthenticated call -- the login page itself needs branding
    // before anyone has logged in (Phase 10 tenant/public-info addition).
    axiosClient.get('/tenant/public-info').then((res) => {
      setTenantInfo(res.data.data);
      setTenant(res.data.data);
    }).catch(() => {
      // Tenant not found (bad subdomain) -- rendered as a plain unbranded
      // login form rather than crashing; the actual login attempt will
      // surface a clearer error.
    });
  }, [setTenant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(POST_LOGIN_ROUTE[user.role] || '/complaints');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex flex-col items-center gap-2 mb-6">
          {tenantInfo?.logoUrl ? (
            <img src={tenantInfo.logoUrl} alt={tenantInfo.name} className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ background: 'var(--tenant-accent, #1D9E75)' }}
            >
              {tenantInfo?.name?.slice(0, 2).toUpperCase() || '··'}
            </div>
          )}
          <p className="font-medium text-gray-900 dark:text-gray-100">{tenantInfo?.name || 'Sign in'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            id="email" type="email" label="Email" required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            id="password" type="password" label="Password" required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <Button type="submit" isLoading={isLoading} className="w-full">Sign in</Button>
        </form>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          New resident?{' '}
          <Link to="/register" className="text-[var(--tenant-accent)] font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}
