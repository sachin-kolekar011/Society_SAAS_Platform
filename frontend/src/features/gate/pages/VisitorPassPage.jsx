import { useState, useEffect } from 'react';
import { gateApi } from '../api/gate.api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';

const STATUS_STYLES = {
  PENDING: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  CHECKED_IN: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  CHECKED_OUT: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

export default function VisitorPassPage() {
  const [passes, setPasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ visitorName: '', visitorPhone: '', purpose: '' });
  const [newPass, setNewPass] = useState(null); // holds the just-created pass so its QR can be shown prominently
  const [isLoading, setIsLoading] = useState(true);

  const fetchPasses = async () => {
    const res = await gateApi.listPasses({});
    setPasses(res.data.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchPasses(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const now = new Date();
    const validUntil = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6-hour default window
    const res = await gateApi.createPass({
      ...form,
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
    });
    setNewPass(res.data.data);
    setForm({ visitorName: '', visitorPhone: '', purpose: '' });
    setShowForm(false);
    fetchPasses();
  };

  const handleCancel = async (id) => { await gateApi.cancelPass(id); fetchPasses(); };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">Visitor passes</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Invite a visitor'}</Button>
      </div>

      {newPass && (
        <div className="mb-6 p-4 rounded-lg border border-[var(--tenant-accent)] flex items-center gap-4">
          <img src={newPass.qrCodeDataUrl} alt="Visitor QR code" className="w-32 h-32" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Pass created for {newPass.visitorName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Show this QR code to the watchman at the gate. Valid until {new Date(newPass.validUntil).toLocaleString()}.
            </p>
            <button onClick={() => setNewPass(null)} className="text-xs text-[var(--tenant-accent)] mt-2">Dismiss</button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <Input id="visitorName" label="Visitor name" required value={form.visitorName}
            onChange={(e) => setForm({ ...form, visitorName: e.target.value })} />
          <Input id="visitorPhone" label="Visitor phone (optional)" value={form.visitorPhone}
            onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })} />
          <Input id="purpose" label="Purpose (optional)" value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          <p className="text-xs text-gray-500 mb-3">Valid for 6 hours from now.</p>
          <Button type="submit">Generate QR pass</Button>
        </form>
      )}

      {isLoading ? null : passes.length === 0 ? (
        <EmptyState title="No visitor passes yet" description="Invite a visitor to generate a gate pass." />
      ) : (
        <ul className="space-y-2">
          {passes.map((p) => (
            <li key={p.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100">{p.visitorName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{p.purpose || 'No purpose given'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_STYLES[p.status]}`}>{p.status.replace('_', ' ')}</span>
                {p.status === 'PENDING' && (
                  <button onClick={() => handleCancel(p.id)} className="text-xs text-red-600">Cancel</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
