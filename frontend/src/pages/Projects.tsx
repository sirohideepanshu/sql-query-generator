import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Database, Trash2, X, CheckCircle2, XCircle, Server } from 'lucide-react';
import { api, type Project, type ProjectCreate, type TestConnectionResult } from '../lib/api';
import { Loading, ErrorBox, EmptyState, Spinner } from '../components/ui';

const emptyForm: ProjectCreate = {
  name: '',
  db_type: 'postgres',
  host: 'localhost',
  port: 5432,
  database_name: '',
  username: '',
  password: '',
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .projects.list()
      .then(setProjects)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load projects'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onDelete = async (id: number) => {
    if (!confirm('Delete this project and its query history?')) return;
    await api.projects.remove(id);
    setProjects((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">Connected databases you can query.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> New project
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Database className="h-10 w-10" />}
          title="No projects yet"
          description="Connect your first PostgreSQL or MySQL database to start asking questions."
          action={
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New project
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <Link to={`/projects/${p.id}`} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <Server className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{p.db_type}</div>
                  </div>
                </Link>
                <button
                  onClick={() => onDelete(p.id)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-500">
                <div className="truncate">
                  {p.host}:{p.port}/{p.database_name}
                </div>
                <div className="text-xs text-slate-400">
                  {p.last_synced_at
                    ? `Synced ${new Date(p.last_synced_at).toLocaleDateString()}`
                    : 'Not synced yet'}
                </div>
              </div>
              <Link
                to={`/projects/${p.id}`}
                className="btn-secondary mt-4 w-full"
              >
                Open playground
              </Link>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ProjectFormModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProjectFormModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<ProjectCreate>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  const update = (k: keyof ProjectCreate, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onDbTypeChange = (val: string) => {
    setForm((f) => ({
      ...f,
      db_type: val,
      port: f.port === 5432 || f.port === 3306 ? (val === 'postgres' ? 5432 : 3306) : f.port,
    }));
  };

  const onTest = async () => {
    setError('');
    setTestResult(null);
    setTesting(true);
    try {
      const res = await api.projects.testConnection(form);
      setTestResult(res);
      if (!res.success) setError('Could not connect with these credentials.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.projects.create(form);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New project</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && <ErrorBox message={error} />}

          <div>
            <label className="label">Project name</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Production analytics"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Database type</label>
              <select
                className="input"
                value={form.db_type}
                onChange={(e) => onDbTypeChange(e.target.value)}
              >
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>
            <div>
              <label className="label">Port</label>
              <input
                type="number"
                required
                className="input"
                value={form.port}
                onChange={(e) => update('port', Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="label">Host</label>
            <input
              required
              className="input"
              value={form.host}
              onChange={(e) => update('host', e.target.value)}
              placeholder="localhost"
            />
          </div>

          <div>
            <label className="label">Database name</label>
            <input
              required
              className="input"
              value={form.database_name}
              onChange={(e) => update('database_name', e.target.value)}
              placeholder="mydb"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Username</label>
              <input
                required
                className="input"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
              />
            </div>
          </div>

          {testResult?.success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Connected · {testResult.tables} tables, {testResult.columns} columns,{' '}
              {testResult.relationships} relationships
            </div>
          )}
          {testResult && !testResult.success && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle className="h-4 w-4" />
              Connection failed
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={onTest}
              disabled={testing}
            >
              {testing && <Spinner className="h-4 w-4" />}
              Test connection
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />}
              Create project
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Creating a project tests the connection, extracts the schema, and stores credentials
            encrypted.
          </p>
        </form>
      </div>
    </div>
  );
}
