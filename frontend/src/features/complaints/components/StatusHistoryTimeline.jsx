import { STATUS_LABELS } from '../../../constants/complaintStatus';

export default function StatusHistoryTimeline({ history }) {
  return (
    <ol className="space-y-4">
      {history.map((entry, i) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--tenant-accent)' }} />
            {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-800 mt-1" />}
          </div>
          <div className="pb-4">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {entry.fromStatus ? `${STATUS_LABELS[entry.fromStatus]} → ` : ''}
              <span className="font-medium">{STATUS_LABELS[entry.toStatus]}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(entry.changedAt).toLocaleString()} · {entry.changedBy.firstName} {entry.changedBy.lastName}
            </p>
            {entry.note && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
