import { useEffect, useState } from 'react';
import { staffApi } from '../api/staff.api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';

const ROLE_LABELS = { WATCHMAN: 'Watchman', MAINTENANCE_STAFF: 'Maintenance Staff' };

// This page is the missing piece: WATCHMAN and MAINTENANCE_STAFF roles
// have worked correctly everywhere they're checked (gate scan, SOS
// alerts) since they were built, but there was never an admin-facing way
// to create an account with either role -- this closes that gap.
export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'WATCHMAN' });
  const [error, setError] = useState(null);

  const fetchStaff = async () => {
    setIsLoading(true);
    const res = await staffApi.list({});
    setStaff(res.data.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await staffApi.create(form);
      setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'WATCHMAN' });
      setShowForm(false);
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not create staff account.');
    }
  };

  const handleToggle = async (member) => {
    await staffApi.setStatus(member.id, !member.isActive);
    fetchStaff();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">Staff</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Watchman and maintenance accounts — separate from residents, not tied to a flat.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add staff'}</Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-3">
            <Input id="firstName" label="First name" required value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input id="lastName" label="Last name" required value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input id="email" type="email" label="Email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input id="password" type="password" label="Temporary password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input id="phone" label="Phone (optional)" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="mb-4">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Role</label>
            <select
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="WATCHMAN">Watchman — scans visitor passes at the gate</option>
              <option value="MAINTENANCE_STAFF">Maintenance Staff — reads notices and polls</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <Button type="submit">Create account</Button>
        </form>
      )}

      {isLoading ? (
        <Skeleton rows={3} />
      ) : staff.length === 0 ? (
        <EmptyState
          title="No staff accounts yet"
          description="Add a watchman account so they can scan visitor passes at the gate."
          actionLabel="Add staff"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <ul className="space-y-2">
          {staff.map((member) => (
            <li key={member.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100">{member.firstName} {member.lastName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{member.email} · {ROLE_LABELS[member.role]}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-md ${member.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => handleToggle(member)} className="text-xs text-gray-500 underline">
                  {member.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}