import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '', residentType: 'OWNER',
  });
  const [flatSearch, setFlatSearch] = useState('');
  const [flatOptions, setFlatOptions] = useState([]);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);

  // Debounced flat search -- calls the public /auth/flats-lookup endpoint
  // (Phase 6 fix: flats are admin-managed, this only searches existing
  // ones, never creates them).
  useEffect(() => {
    if (!flatSearch) {
      setFlatOptions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await authApi.flatsLookup(flatSearch);
      setFlatOptions(res.data.data);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [flatSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedFlat) {
      setError('Please select your flat from the list.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.register({ ...form, flatId: selectedFlat.id });
      navigate('/login', { state: { justRegistered: true } });
    } catch (err) {
      // Mirrors the backend's message directly -- e.g. "Selected flat was
      // not found. Please contact your society admin." from Phase 6's
      // registration validation.
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Create your account</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Register as a resident</p>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Input id="firstName" label="First name" required value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input id="lastName" label="Last name" required value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input id="email" type="email" label="Email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input id="password" type="password" label="Password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input id="phone" label="Phone (optional)" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />

          <div className="mb-4 relative">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Your flat</label>
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
              placeholder="Search flat number or block"
              value={selectedFlat ? `${selectedFlat.block ? selectedFlat.block + ' - ' : ''}${selectedFlat.flatNumber}` : flatSearch}
              onChange={(e) => { setSelectedFlat(null); setFlatSearch(e.target.value); }}
            />
            {flatOptions.length > 0 && !selectedFlat && (
              <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-auto">
                {flatOptions.map((flat) => (
                  <li key={flat.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => { setSelectedFlat(flat); setFlatOptions([]); }}
                    >
                      {flat.block ? `${flat.block} - ` : ''}{flat.flatNumber}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {flatSearch && flatOptions.length === 0 && !selectedFlat && (
              <p className="text-xs text-gray-500 mt-1">No matching flat. Contact your society admin if yours isn't listed.</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">You are the</label>
            <select
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
              value={form.residentType}
              onChange={(e) => setForm({ ...form, residentType: e.target.value })}
            >
              <option value="OWNER">Owner</option>
              <option value="TENANT_OCCUPANT">Tenant</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <Button type="submit" isLoading={isLoading} className="w-full">Create account</Button>
        </form>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          Already registered? <Link to="/login" className="text-[var(--tenant-accent)] font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
