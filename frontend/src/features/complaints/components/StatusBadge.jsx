import { STATUS_LABELS } from '../../../constants/complaintStatus';

// Color mapping is semantic (Phase 8 §4): OPEN neutral, IN_PROGRESS amber,
// RESOLVED green, overdue red -- always paired with the text label, never
// color alone, so it doesn't rely on color perception to be understood.
const STATUS_CLASSES = {
  OPEN: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

const OVERDUE_CLASSES = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';

export default function StatusBadge({ status, isOverdue }) {
  const classes = isOverdue ? OVERDUE_CLASSES : STATUS_CLASSES[status];
  const label = isOverdue ? 'Overdue' : STATUS_LABELS[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${classes}`}>
      {label}
    </span>
  );
}
