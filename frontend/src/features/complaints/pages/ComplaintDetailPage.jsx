import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { complaintsApi } from '../api/complaints.api';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLES } from '../../../constants/roles';
import { PRIORITIES, STATUS_LABELS } from '../../../constants/complaintStatus';
import StatusBadge from '../components/StatusBadge';
import StatusHistoryTimeline from '../components/StatusHistoryTimeline';
import Skeleton from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';

// Mirrors the backend's forward-only rule (Phase 9 complaint.service.js)
// so the UI doesn't even offer an illegal transition, rather than letting
// the user pick one and showing a 422 after the fact.
const ALLOWED_NEXT = { OPEN: ['IN_PROGRESS', 'RESOLVED'], IN_PROGRESS: ['RESOLVED'], RESOLVED: [] };

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchComplaint = useCallback(async () => {
    const res = await complaintsApi.getById(id);
    setComplaint(res.data.data);
    setIsLoading(false);
  }, [id]);

  useEffect(() => { fetchComplaint(); }, [fetchComplaint]);

  const handleStatusUpdate = async () => {
    if (!nextStatus) return;
    setIsUpdating(true);
    try {
      await complaintsApi.updateStatus(id, { status: nextStatus, note: note || undefined });
      setNote('');
      setNextStatus('');
      await fetchComplaint();
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (priority) => {
    await complaintsApi.updatePriority(id, priority);
    fetchComplaint();
  };

  if (isLoading) return <Skeleton rows={5} />;
  if (!complaint) return null;

  const availableNextStatuses = ALLOWED_NEXT[complaint.status];

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">{complaint.category?.name}</h1>
        <StatusBadge status={complaint.status} isOverdue={complaint.isOverdue} />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{complaint.description}</p>
      {complaint.photoUrl && (
        <img src={complaint.photoUrl} alt="Complaint photo" className="w-full max-w-xs rounded-lg mb-4" />
      )}

      {isAdmin && (
        <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Admin controls</p>

          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  className={`text-xs px-2 py-1 rounded-md border ${
                    complaint.priority === p
                      ? 'border-[var(--tenant-accent)] text-[var(--tenant-accent)]'
                      : 'border-gray-300 dark:border-gray-700 text-gray-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {availableNextStatuses.length > 0 ? (
            <>
              <label className="block text-xs text-gray-500 mb-1">Update status</label>
              <div className="flex gap-2 mb-2">
                {availableNextStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => setNextStatus(s)}
                    className={`text-xs px-2 py-1 rounded-md border ${
                      nextStatus === s
                        ? 'border-[var(--tenant-accent)] text-[var(--tenant-accent)]'
                        : 'border-gray-300 dark:border-gray-700 text-gray-500'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Optional note"
                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 mb-2 bg-white dark:bg-gray-900"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button onClick={handleStatusUpdate} isLoading={isUpdating} disabled={!nextStatus}>
                Update status
              </Button>
            </>
          ) : (
            <p className="text-xs text-gray-500">This complaint is resolved and closed.</p>
          )}
        </div>
      )}

      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">History</p>
      <StatusHistoryTimeline history={complaint.statusHistory} />
    </div>
  );
}
