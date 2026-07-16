import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi, setSuperAdminToken } from '../api/superAdmin.api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await superAdminApi.login(form.email, form.password);
      setSuperAdminToken(res.data.data.accessToken);
      navigate('/super-admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="mb-6">
          <p className="font-medium text-gray-100">Platform Super Admin</p>
          <p className="text-xs text-gray-500 mt-1">Not tied to any society — manages the whole platform.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <Input id="email" type="email" label="Email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input id="password" type="password" label="Password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
          <Button type="submit" isLoading={isLoading} className="w-full">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
