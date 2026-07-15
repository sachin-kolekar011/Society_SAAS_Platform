import { useEffect, useState, useCallback } from 'react';
import { sosApi } from '../api/sos.api';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';

const STATUS_STYLES = {
  ACTIVE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

export default function SosAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    const res = await sosApi.list();
    setAlerts(res.data.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
    // Simple poll every 15s -- there's no push infrastructure (Phase 2
    // deployment is a single EC2 box, no websocket layer), so this is the
    // pragmatic way for the admin/watchman screen to catch a new alert
    // without a manual refresh, without adding a whole realtime stack for
    // one feature.
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledge = async (id) => { await sosApi.acknowledge(id); fetchAlerts(); };
  const handleResolve = async (id) => { await sosApi.resolve(id); fetchAlerts(); };

  if (isLoading) return <Skeleton rows={3} />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Emergency alerts</h1>
      {alerts.length === 0 ? (
        <EmptyState title="No alerts" description="Nothing has been raised." />
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {a.resident.user.firstName} {a.resident.user.lastName} · {a.resident.flat.block ? a.resident.flat.block + '-' : ''}{a.resident.flat.flatNumber}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(a.triggeredAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                {a.status === 'ACTIVE' && (
                  <button onClick={() => handleAcknowledge(a.id)} className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700">
                    Acknowledge
                  </button>
                )}
                {a.status !== 'RESOLVED' && (
                  <button onClick={() => handleResolve(a.id)} className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700">
                    Resolve
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
