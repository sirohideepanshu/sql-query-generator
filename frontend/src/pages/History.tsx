import { useEffect, useState } from 'react';
import { History as HistoryIcon, Clock, CheckCircle2 } from 'lucide-react';
import { api, type Project, type QueryResult } from '../lib/api';
import { Loading, ErrorBox, EmptyState, RiskBadge } from '../components/ui';

export default function History() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [queries, setQueries] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.projects
      .list()
      .then((p) => {
        setProjects(p);
        if (p.length > 0) setSelected(p[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected === null) return;
    setLoadingQueries(true);
    api.query
      .history(selected)
      .then(setQueries)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load history'))
      .finally(() => setLoadingQueries(false));
  }, [selected]);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Query history</h1>
        <p className="mt-1 text-sm text-slate-500">Previously generated and executed queries.</p>
      </div>

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      {projects.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="h-10 w-10" />}
          title="No history yet"
          description="Create a project and generate queries to see them here."
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  selected === p.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {loadingQueries ? (
            <Loading />
          ) : queries.length === 0 ? (
            <EmptyState
              icon={<HistoryIcon className="h-10 w-10" />}
              title="No queries for this project"
              description="Head to the project playground and ask a question."
            />
          ) : (
            <div className="space-y-3">
              {queries.map((q) => (
                <div key={q.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{q.question}</p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-[12px] text-slate-700">
                        {q.generated_sql}
                      </pre>
                    </div>
                    <RiskBadge level={q.risk_level} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(q.created_at).toLocaleString()}
                    </span>
                    {q.executed && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> executed
                        {q.execution_time_ms != null && ` · ${q.execution_time_ms.toFixed(1)} ms`}
                        {q.rows_returned != null && ` · ${q.rows_returned} rows`}
                      </span>
                    )}
                    <span className="uppercase tracking-wide">{q.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
