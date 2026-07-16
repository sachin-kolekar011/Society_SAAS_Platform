import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi, getSuperAdminToken, setSuperAdminToken } from '../api/superAdmin.api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', addressLine: '', city: '', adminEmail: '', adminPassword: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lightweight guard -- no token in memory means either never logged in
  // or a page refresh (in-memory token, deliberately not persisted, is
  // lost on reload -- same XSS-avoidance reasoning as the tenant
  // AuthContext's access token). Bounce back to login rather than show a
  // broken dashboard that fails every request.
  useEffect(() => {
    if (!getSuperAdminToken()) {
      navigate('/super-admin/login');
      return;
    }
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setIsLoading(true);
    const res = await superAdminApi.listTenants({});
    setTenants(res.data.data);
    setIsLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await superAdminApi.createTenant(form);
      setForm({ name: '', slug: '', addressLine: '', city: '', adminEmail: '', adminPassword: '' });
      setShowForm(false);
      fetchTenants();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not create tenant.');
    }
  };

  const handleToggleStatus = async (tenant) => {
    await superAdminApi.setTenantStatus(tenant.id, !tenant.isActive);
    fetchTenants();
  };

  const logout = () => {
    setSuperAdminToken(null);
    navigate('/super-admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-lg font-medium">Societies</h1>
            <p className="text-xs text-gray-500 mt-1">Every tenant on this platform.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'New society'}</Button>
            <Button variant="secondary" onClick={logout}>Sign out</Button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-8 p-4 rounded-lg border border-gray-800">
            <p className="text-sm font-medium mb-3">Create a new society</p>
            <div className="grid grid-cols-2 gap-3">
              <Input id="name" label="Society name" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input id="slug" label="Subdomain slug" required
                placeholder="greenvalley" value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input id="addressLine" label="Address (optional)" value={form.addressLine}
                onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
              <Input id="city" label="City (optional)" value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <p className="text-xs text-gray-500 mb-2 mt-2">This creates the society's first Admin account too:</p>
            <div className="grid grid-cols-2 gap-3">
              <Input id="adminEmail" type="email" label="Admin email" required value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
              <Input id="adminPassword" type="password" label="Admin password" required value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
            </div>
            {form.slug && (
              <p className="text-xs text-gray-500 mb-3">
                Will be reachable at <span className="text-cyan-400">http://{form.slug}.localhost:5173</span>
              </p>
            )}
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <Button type="submit">Create society</Button>
          </form>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : tenants.length === 0 ? (
          <p className="text-sm text-gray-500">No societies yet — create the first one above.</p>
        ) : (
          <ul className="space-y-2">
            {tenants.map((t) => (
              <li key={t.id} className="p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.slug}.localhost:5173</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-md ${t.isActive ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleToggleStatus(t)} className="text-xs text-gray-400 underline">
                    {t.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
