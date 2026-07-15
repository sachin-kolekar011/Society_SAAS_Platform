import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboard.api';
import Skeleton from '../../../components/ui/Skeleton';
import CategoryBarChart from '../components/CategoryBarChart';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    dashboardApi.getSummary().then((res) => setSummary(res.data.data));
  }, []);

  if (!summary) return <Skeleton rows={4} />;

  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard label="Total complaints" value={summary.totalComplaints} />
        <MetricCard label="Open" value={summary.byStatus.open} />
        <MetricCard label="Overdue" value={summary.overdueCount} danger />
      </div>

      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">By category</p>
        <CategoryBarChart data={summary.byCategory} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, danger }) {
  return (
    <div className={`rounded-lg p-4 ${danger ? 'bg-red-50 dark:bg-red-950/30' : 'bg-gray-50 dark:bg-gray-900'}`}>
      <p className={`text-sm mb-1 ${danger ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{label}</p>
      <p className={`text-2xl font-medium ${danger ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
    </div>
  );
}
