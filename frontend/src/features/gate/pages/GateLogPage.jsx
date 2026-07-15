import { useEffect, useState } from 'react';
import { gateApi } from '../api/gate.api';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';

const STATUS_STYLES = {
  PENDING: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  CHECKED_IN: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  CHECKED_OUT: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

// This is the "entry gate to see admin" screen -- live visibility into
// every visitor pass across the whole society, not just the ones a single
// watchman shift has handled.
export default function GateLogPage() {
  const [passes, setPasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    gateApi.listPasses({}).then((res) => { setPasses(res.data.data); setIsLoading(false); });
  }, []);

  if (isLoading) return <Skeleton rows={4} />;

  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Gate log</h1>
      {passes.length === 0 ? (
        <EmptyState title="No visitor activity yet" />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th className="py-2 font-medium">Visitor</th>
              <th className="py-2 font-medium">Flat</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium">Checked in</th>
              <th className="py-2 font-medium">Checked out</th>
            </tr>
          </thead>
          <tbody>
            {passes.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 dark:border-gray-900">
                <td className="py-2 text-gray-900 dark:text-gray-100">{p.visitorName}</td>
                <td className="py-2 text-gray-600 dark:text-gray-300">
                  {p.resident.flat.block ? p.resident.flat.block + '-' : ''}{p.resident.flat.flatNumber}
                </td>
                <td className="py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_STYLES[p.status]}`}>{p.status.replace('_', ' ')}</span></td>
                <td className="py-2 text-gray-500 dark:text-gray-400">{p.checkedInAt ? new Date(p.checkedInAt).toLocaleTimeString() : '—'}</td>
                <td className="py-2 text-gray-500 dark:text-gray-400">{p.checkedOutAt ? new Date(p.checkedOutAt).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
