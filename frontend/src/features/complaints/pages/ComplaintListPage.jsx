import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { complaintsApi } from '../api/complaints.api';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLES } from '../../../constants/roles';
import { STATUS_LABELS } from '../../../constants/complaintStatus';
import StatusBadge from '../components/StatusBadge';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';

export default function ComplaintListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', categoryId: '' });
  const [categories, setCategories] = useState([]);

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    const params = {
      ...(filters.status && { status: filters.status }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(isAdmin && { sortOverdueFirst: true }), // admin view surfaces overdue at the top, per PDF spec
    };
    const res = await complaintsApi.list(params);
    setComplaints(res.data.data);
    setIsLoading(false);
  }, [filters, isAdmin]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);
  useEffect(() => { complaintsApi.getCategories().then((res) => setCategories(res.data.data)); }, []);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {isAdmin ? 'All complaints' : 'Your complaints'}
        </h1>
        {!isAdmin && <Link to="/complaints/new"><Button>Raise a complaint</Button></Link>}
      </div>

      {isAdmin && (
        <div className="flex gap-2 mb-4">
          <select
            className="text-sm rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 bg-white dark:bg-gray-900"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            className="text-sm rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 bg-white dark:bg-gray-900"
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {isLoading ? (
        <Skeleton rows={4} />
      ) : complaints.length === 0 ? (
        <EmptyState
          title="No complaints yet"
          description={isAdmin ? "Nothing's been raised by residents yet." : "You haven't raised any complaints."}
          actionLabel={!isAdmin ? 'Raise a complaint' : undefined}
          onAction={!isAdmin ? () => (window.location.href = '/complaints/new') : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {complaints.map((c) => (
            <li key={c.id}>
              <Link
                to={`/complaints/${c.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <div>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{c.description.slice(0, 60)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {c.category?.name}{isAdmin && c.resident ? ` · ${c.resident.flat.block ? c.resident.flat.block + '-' : ''}${c.resident.flat.flatNumber}` : ''}
                  </p>
                </div>
                <StatusBadge status={c.status} isOverdue={c.isOverdue} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
