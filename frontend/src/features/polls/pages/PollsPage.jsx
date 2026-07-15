import { useEffect, useState } from 'react';
import { pollsApi } from '../api/polls.api';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLES } from '../../../constants/roles';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';

export default function PollsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: '', options: ['', ''], closesInDays: 7 });

  const fetchPolls = async () => {
    const res = await pollsApi.list();
    setPolls(res.data.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchPolls(); }, []);

  const handleVote = async (pollId, optionId) => {
    await pollsApi.vote(pollId, optionId);
    fetchPolls();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const closesAt = new Date(Date.now() + form.closesInDays * 86400000).toISOString();
    await pollsApi.create({ question: form.question, options: form.options.filter(Boolean), closesAt });
    setForm({ question: '', options: ['', ''], closesInDays: 7 });
    setShowForm(false);
    fetchPolls();
  };

  if (isLoading) return <Skeleton rows={3} />;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">Society polls</h1>
        {isAdmin && <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'New poll'}</Button>}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          <input required placeholder="Question" className="w-full mb-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900"
            value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          {form.options.map((opt, i) => (
            <input key={i} required placeholder={`Option ${i + 1}`} className="w-full mb-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900"
              value={opt} onChange={(e) => { const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts }); }} />
          ))}
          <button type="button" onClick={() => setForm({ ...form, options: [...form.options, ''] })} className="text-xs text-[var(--tenant-accent)] mb-3">
            + Add option
          </button>
          <Button type="submit">Create poll</Button>
        </form>
      )}

      {polls.length === 0 ? (
        <EmptyState title="No polls yet" description="Nothing's been put to a vote." />
      ) : (
        <ul className="space-y-4">
          {polls.map((poll) => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
            const isClosed = !poll.isActive || new Date() > new Date(poll.closesAt);
            return (
              <li key={poll.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">{poll.question}</p>
                <div className="space-y-2">
                  {poll.options.map((opt) => {
                    const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                    const isMyVote = poll.myVoteOptionId === opt.id;
                    const canVote = !isAdmin && !poll.myVoteOptionId && !isClosed;
                    return (
                      <button
                        key={opt.id}
                        disabled={!canVote}
                        onClick={() => canVote && handleVote(poll.id, opt.id)}
                        className="w-full text-left relative rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden disabled:cursor-default"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-gray-100 dark:bg-gray-800"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative px-3 py-2 flex justify-between text-sm">
                          <span className={isMyVote ? 'font-medium text-[var(--tenant-accent)]' : 'text-gray-900 dark:text-gray-100'}>
                            {opt.text} {isMyVote && '✓'}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">{pct}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {isClosed ? 'Closed' : `Closes ${new Date(poll.closesAt).toLocaleDateString()}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
