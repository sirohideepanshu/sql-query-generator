import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, MessageSquare, PlayCircle, Database, ArrowRight } from 'lucide-react';
import { api, type DashboardStats } from '../lib/api';
import { Loading, ErrorBox } from '../components/ui';
import { useAuth } from '../lib/auth';

const cards = [
  { key: 'total_projects', label: 'Projects', icon: FolderKanban, color: 'text-indigo-600 bg-indigo-50' },
  { key: 'total_queries', label: 'Queries generated', icon: MessageSquare, color: 'text-violet-600 bg-violet-50' },
  { key: 'queries_executed', label: 'Queries executed', icon: PlayCircle, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'databases_connected', label: 'Databases connected', icon: Database, color: 'text-amber-600 bg-amber-50' },
] as const;

export default function Dashboard() {
  const { username } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboardStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{username ? `, ${username}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here&apos;s an overview of your workspace.</p>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="card p-5">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-3xl font-bold text-slate-900">{stats?.[key] ?? 0}</div>
                <div className="mt-1 text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 card flex items-center justify-between p-6">
            <div>
              <h2 className="text-base font-semibold">Ready to query?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Connect a database, then ask questions in plain English.
              </p>
            </div>
            <Link to="/projects" className="btn-primary">
              Go to Projects <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
