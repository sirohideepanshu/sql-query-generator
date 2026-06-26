// Typed REST client for the NL2SQL Assistant backend (FastAPI, /api/v1).

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000/api/v1';

const TOKEN_KEY = 'sql_assist_token';
const USER_KEY = 'sql_assist_username';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setSession(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function getUsername(): string {
  return localStorage.getItem(USER_KEY) || '';
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    if (!['/login', '/signup', '/'].includes(window.location.pathname)) {
      window.location.href = '/login';
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && (data.detail || data?.error?.message)) || `Request failed (${res.status})`;
    throw new ApiError(typeof msg === 'string' ? msg : JSON.stringify(msg), res.status);
  }
  return data as T;
}

// ---------- Types ----------
export interface AuthResponse {
  username: string;
  access_token: string;
}
export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}
export interface DashboardStats {
  total_projects: number;
  total_queries: number;
  queries_executed: number;
  databases_connected: number;
}
export interface Project {
  id: number;
  name: string;
  user_id: number;
  db_type: string;
  host: string;
  port: number;
  database_name: string;
  db_username: string;
  schema_json?: Record<string, any> | null;
  schema_summary?: string | null;
  relationship_summary?: string | null;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}
export interface ProjectCreate {
  name: string;
  db_type: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
}
export interface TestConnectionResult {
  success: boolean;
  tables: number;
  columns: number;
  relationships: number;
}
export interface SchemaInfo {
  schema_json?: Record<string, any> | null;
  schema_summary?: string | null;
  relationship_summary?: string | null;
}
export interface QueryAlternative {
  sql: string;
  explanation: string;
}
export interface AssistResult {
  primary_query: string;
  explanation: string;
  risk_level: string;
  risk_explanation: string;
  affected_tables: string[];
  alternatives: QueryAlternative[];
  optimization_suggestions: string[];
}
export interface QueryResult {
  id: number;
  project_id: number;
  question: string;
  generated_sql: string;
  query_explanation: string;
  affected_tables: string;
  estimated_rows?: number | null;
  estimated_cost?: number | null;
  risk_level: string;
  status: string;
  executed: boolean;
  execution_time_ms?: number | null;
  rows_returned?: number | null;
  result_summary?: string | null;
  created_at: string;
  alternatives?: QueryAlternative[] | null;
  optimization_suggestions?: string[] | null;
}
export interface ExecuteResult {
  success: boolean;
  error?: string | null;
  execution_time_ms: number;
  rows_returned: number;
  columns: string[];
  data: Record<string, any>[];
  estimated_rows?: number | null;
  estimated_cost?: number | null;
  transactional?: boolean;
}
export interface ValidateResult {
  valid?: boolean;
  warnings: string[];
  [k: string]: any;
}
export interface AnalyzeResult {
  risk_level: string;
  explanation: string;
  warnings: string[];
  estimated_rows?: number | null;
  estimated_cost?: number | null;
}

// ---------- API ----------
export const api = {
  signup: (body: { username: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  signin: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/signin', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<User>('/auth/me'),

  // No-database NL->SQL generation (conversational assistant)
  assist: (body: { question: string; dialect: string; schema_text?: string }) =>
    request<AssistResult>('/assist/generate', { method: 'POST', body: JSON.stringify(body) }),

  dashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  projects: {
    list: () => request<Project[]>('/projects'),
    get: (id: number) => request<Project>(`/projects/${id}`),
    create: (body: ProjectCreate) =>
      request<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: number) => request<unknown>(`/projects/${id}`, { method: 'DELETE' }),
    sync: (id: number) => request<Project>(`/projects/${id}/sync`, { method: 'POST' }),
    schema: (id: number) => request<SchemaInfo>(`/projects/${id}/schema`),
    testConnection: (body: ProjectCreate) =>
      request<TestConnectionResult>('/projects/test-connection', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  query: {
    generate: (body: { project_id: number; question: string }) =>
      request<QueryResult>('/query/generate', { method: 'POST', body: JSON.stringify(body) }),
    validate: (body: { project_id: number; sql: string }) =>
      request<ValidateResult>('/query/validate', { method: 'POST', body: JSON.stringify(body) }),
    analyze: (body: { project_id: number; sql: string }) =>
      request<AnalyzeResult>('/query/analyze', { method: 'POST', body: JSON.stringify(body) }),
    explain: (body: { project_id: number; sql: string }) =>
      request<{ summary: string; affected_tables: string[]; clauses: Record<string, string> }>(
        '/query/explain',
        { method: 'POST', body: JSON.stringify(body) }
      ),
    execute: (body: { query_id: number; sql?: string }) =>
      request<ExecuteResult>('/query/execute', { method: 'POST', body: JSON.stringify(body) }),
    commit: (body: { query_id: number }) =>
      request<{ success: boolean; message: string }>('/query/commit', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    rollback: (body: { query_id: number }) =>
      request<{ success: boolean; message: string }>('/query/rollback', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    history: (projectId: number) =>
      request<QueryResult[]>(`/query/history?project_id=${projectId}`),
    get: (id: number) => request<QueryResult>(`/query/${id}`),
  },
};
