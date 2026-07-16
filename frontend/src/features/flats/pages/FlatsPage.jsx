import { useEffect, useState } from 'react';
import { flatsApi } from '../api/flats.api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';

const FLAT_TYPES = ['ONE_BHK', 'TWO_BHK', 'THREE_BHK', 'OTHER'];

// This page exists specifically because registration requires picking an
// EXISTING flat (Phase 6's fix: admin-managed flats, not auto-created on
// registration) -- without an admin-facing way to create flats, no
// resident could ever complete registration. Found by real testing, not
// by review.
export default function FlatsPage() {
  const [flats, setFlats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ flatNumber: '', block: '', floor: '', type: 'OTHER' });
  const [error, setError] = useState(null);

  const fetchFlats = async () => {
    setIsLoading(true);
    const res = await flatsApi.list({});
    setFlats(res.data.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchFlats(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await flatsApi.create({
        flatNumber: form.flatNumber,
        block: form.block || undefined,
        floor: form.floor ? Number(form.floor) : undefined,
        type: form.type,
      });
      setForm({ flatNumber: '', block: '', floor: '', type: 'OTHER' });
      setShowForm(false);
      fetchFlats();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not create flat.');
    }
  };

  const handleDelete = async (id) => {
    await flatsApi.remove(id);
    fetchFlats();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">Flats</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Residents can only register against a flat that's already listed here.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add flat'}</Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-3">
            <Input id="flatNumber" label="Flat number" required value={form.flatNumber}
              onChange={(e) => setForm({ ...form, flatNumber: e.target.value })} />
            <Input id="block" label="Block (optional)" value={form.block}
              onChange={(e) => setForm({ ...form, block: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="floor" type="number" label="Floor (optional)" value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Type</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {FLAT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <Button type="submit">Add flat</Button>
        </form>
      )}

      {isLoading ? (
        <Skeleton rows={4} />
      ) : flats.length === 0 ? (
        <EmptyState
          title="No flats yet"
          description="Add your society's flats so residents can register against them."
          actionLabel="Add flat"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <ul className="space-y-2">
          {flats.map((flat) => (
            <li key={flat.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {flat.block ? `${flat.block} - ` : ''}{flat.flatNumber}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {flat.type.replace('_', ' ')}{flat.floor != null ? ` · Floor ${flat.floor}` : ''}
                </p>
              </div>
              <button onClick={() => handleDelete(flat.id)} className="text-xs text-red-600">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
