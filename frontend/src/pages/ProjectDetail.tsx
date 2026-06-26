import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Play,
  RefreshCw,
  Table2,
  Check,
  Undo2,
  Lightbulb,
  ChevronDown,
} from 'lucide-react';
import {
  api,
  type Project,
  type QueryResult,
  type ExecuteResult,
} from '../lib/api';
import { Loading, ErrorBox, RiskBadge, Spinner } from '../components/ui';

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const [question, setQuestion] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);

  const load = () => {
    setLoading(true);
    api.projects
      .get(projectId)
      .then(setProject)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load project'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!Number.isNaN(projectId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const onSync = async () => {
    setSyncing(true);
    try {
      const updated = await api.projects.sync(projectId);
      setProject(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schema sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const onGenerate = async () => {
    if (!question.trim()) return;
    setGenError('');
    setGenerating(true);
    setResult(null);
    try {
      const res = await api.query.generate({ project_id: projectId, question: question.trim() });
      setResult(res);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Loading label="Loading project…" />;
  if (error) return <ErrorBox message={error} />;
  if (!project) return null;

  const tables: any[] = project.schema_json?.tables ?? [];

  return (
    <div>
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {project.db_type} · {project.host}:{project.port}/{project.database_name}
          </p>
        </div>
        <button className="btn-secondary" onClick={onSync} disabled={syncing}>
          {syncing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          Sync schema
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Playground */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <label className="label">Ask in plain English</label>
            <textarea
              className="input min-h-[90px] resize-y font-normal"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Show the top 10 customers by total spend last month"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onGenerate();
              }}
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">⌘/Ctrl + Enter to generate</span>
              <button className="btn-primary" onClick={onGenerate} disabled={generating || !question.trim()}>
                {generating ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                Generate SQL
              </button>
            </div>
            {genError && <div className="mt-3"><ErrorBox message={genError} /></div>}
          </div>

          {result && <ResultPanel result={result} />}
        </div>

        {/* Schema sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Table2 className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold">Schema</h2>
              <span className="ml-auto text-xs text-slate-400">{tables.length} tables</span>
            </div>
            {tables.length === 0 ? (
              <p className="text-sm text-slate-500">
                No schema yet. Click <span className="font-medium">Sync schema</span> to extract it.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {tables.map((t, i) => (
                  <SchemaTable key={i} table={t} />
                ))}
              </div>
            )}
          </div>
          {project.schema_summary && (
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-semibold">Summary</h2>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                {project.schema_summary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SchemaTable({ table }: { table: any }) {
  const [open, setOpen] = useState(false);
  const columns: any[] = table.columns ?? [];
  return (
    <div className="rounded-lg border border-slate-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
        {table.name}
        <span className="ml-auto text-xs text-slate-400">{columns.length}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 py-2">
          {columns.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-0.5 text-xs">
              <span className="font-mono text-slate-600">{c.name}</span>
              <span className="text-slate-400">{c.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: QueryResult }) {
  const [sql, setSql] = useState(result.generated_sql);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [execError, setExecError] = useState('');
  const [txAction, setTxAction] = useState('');

  // Reset when a new query is generated
  const initialSql = useMemo(() => result.generated_sql, [result.id]);
  useEffect(() => {
    setSql(initialSql);
    setExecResult(null);
    setExecError('');
    setTxAction('');
  }, [initialSql]);

  const onExecute = async () => {
    setExecError('');
    setExecuting(true);
    setExecResult(null);
    try {
      const res = await api.query.execute({ query_id: result.id, sql });
      setExecResult(res);
      if (!res.success && res.error) setExecError(res.error);
    } catch (e) {
      setExecError(e instanceof Error ? e.message : 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const onTx = async (kind: 'commit' | 'rollback') => {
    setTxAction(kind);
    try {
      await api.query[kind]({ query_id: result.id });
      setTxAction(`${kind}-done`);
    } catch (e) {
      setExecError(e instanceof Error ? e.message : `${kind} failed`);
      setTxAction('');
    }
  };

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-sm font-semibold">Generated query</h2>
        <RiskBadge level={result.risk_level} />
        <span className="ml-auto text-xs text-slate-400">
          affects: {result.affected_tables || '—'}
        </span>
      </div>

      <textarea
        className="input min-h-[120px] resize-y font-mono text-[13px] leading-relaxed"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        spellCheck={false}
      />

      {result.query_explanation && (
        <p className="mt-3 text-sm text-slate-600">{result.query_explanation}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary" onClick={onExecute} disabled={executing}>
          {executing ? <Spinner className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          Run query
        </button>
        <span className="text-xs text-slate-400">query #{result.id}</span>
      </div>

      {execError && <div className="mt-4"><ErrorBox message={execError} /></div>}

      {execResult?.success && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-3 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{execResult.rows_returned} rows</span>
            <span>·</span>
            <span>{execResult.execution_time_ms.toFixed(1)} ms</span>
            {execResult.transactional && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                Open transaction
              </span>
            )}
          </div>
          <ResultTable result={execResult} />

          {execResult.transactional && (
            <div className="mt-4 flex items-center gap-3">
              {txAction === 'commit-done' || txAction === 'rollback-done' ? (
                <span className="text-sm font-medium text-emerald-600">
                  Transaction {txAction === 'commit-done' ? 'committed' : 'rolled back'}.
                </span>
              ) : (
                <>
                  <button
                    className="btn-primary"
                    onClick={() => onTx('commit')}
                    disabled={Boolean(txAction)}
                  >
                    {txAction === 'commit' ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    Commit
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => onTx('rollback')}
                    disabled={Boolean(txAction)}
                  >
                    {txAction === 'rollback' ? <Spinner className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                    Rollback
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {result.alternatives && result.alternatives.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold">Alternatives</h3>
          <div className="space-y-2">
            {result.alternatives.map((alt, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-3">
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[12px] text-slate-700">
                  {alt.sql}
                </pre>
                {alt.explanation && (
                  <p className="mt-1.5 text-xs text-slate-500">{alt.explanation}</p>
                )}
                <button
                  className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
                  onClick={() => setSql(alt.sql)}
                >
                  Use this query
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.optimization_suggestions && result.optimization_suggestions.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Optimization tips
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
            {result.optimization_suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResultTable({ result }: { result: ExecuteResult }) {
  if (result.columns.length === 0) {
    return <p className="text-sm text-slate-500">Query ran successfully with no columns returned.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {result.columns.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {result.data.slice(0, 200).map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {result.columns.map((c) => (
                <td key={c} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">
                  {formatCell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.data.length > 200 && (
        <div className="bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
          Showing first 200 of {result.data.length} rows
        </div>
      )}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
