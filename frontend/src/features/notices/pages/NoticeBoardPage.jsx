import { useEffect, useState } from 'react';
import { noticesApi } from '../api/notices.api';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLES } from '../../../constants/roles';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';

export default function NoticeBoardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', isImportant: false });

  const fetchNotices = async () => {
    setIsLoading(true);
    const res = await noticesApi.list({});
    setNotices(res.data.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchNotices(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await noticesApi.create(form);
    setForm({ title: '', body: '', isImportant: false });
    setShowForm(false);
    fetchNotices();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notice board</h1>
        {isAdmin && <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Post notice'}</Button>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <input
            required placeholder="Title"
            className="w-full mb-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            required placeholder="Notice body" rows={3}
            className="w-full mb-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <input type="checkbox" checked={form.isImportant} onChange={(e) => setForm({ ...form, isImportant: e.target.checked })} />
            Mark as important (emails every resident)
          </label>
          <Button type="submit">Post</Button>
        </form>
      )}

      {isLoading ? (
        <Skeleton rows={3} />
      ) : notices.length === 0 ? (
        <EmptyState title="No notices yet" description="Nothing's been posted to the board." />
      ) : (
        <ul className="space-y-2">
          {notices.map((n) => (
            <li key={n.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                {n.isImportant && <span className="text-xs">📌</span>}
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{n.body}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(n.createdAt).toLocaleDateString()} · {n.postedBy.firstName} {n.postedBy.lastName}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
