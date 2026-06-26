import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowUp,
  Plus,
  Copy,
  Check,
  ChevronDown,
  Lightbulb,
  Loader2,
  Trash2,
  MessageSquare,
  Code2,
  LogOut,
  Database,
} from 'lucide-react';
import { api, type AssistResult } from '../lib/api';
import { RiskBadge, ErrorBox } from '../components/ui';
import { useAuth } from '../lib/auth';

type Message =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; kind: 'result'; result: AssistResult }
  | { id: number; role: 'assistant'; kind: 'error'; text: string }
  | { id: number; role: 'assistant'; kind: 'pending' };

interface Conversation {
  id: string;
  title: string;
  dialect: string;
  schemaText: string;
  messages: Message[];
}

const DIALECTS = ['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Oracle', 'Standard SQL'];

const EXAMPLES = [
  'Get the 5 highest-paid employees in each department',
  'Find customers who placed more than 3 orders last month',
  'Show monthly revenue and its growth percentage',
  'List products that have never been ordered',
];

const STORAGE_KEY = 'sql_assist_conversations';

let mid = 1;
const nextMsgId = () => mid++;
let cseq = 0;
const newConvId = () => `c_${Date.now()}_${cseq++}`;

function freshConversation(): Conversation {
  return { id: newConvId(), title: 'New chat', dialect: 'PostgreSQL', schemaText: '', messages: [] };
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: Conversation[] = JSON.parse(raw);
    // Drop any stale "pending" messages from a previous session
    return parsed.map((c) => ({
      ...c,
      messages: c.messages.filter((m) => !(m.role === 'assistant' && m.kind === 'pending')),
    }));
  } catch {
    return [];
  }
}

export default function Chat() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const loaded = loadConversations();
    return loaded.length ? loaded : [freshConversation()];
  });
  const [activeId, setActiveId] = useState<string>(() => '');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Ensure an active conversation
  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [active?.messages]);

  const patchActive = (updater: (c: Conversation) => Conversation) =>
    setConversations((cs) => cs.map((c) => (c.id === active?.id ? updater(c) : c)));

  const startNewChat = () => {
    const c = freshConversation();
    setConversations((cs) => [c, ...cs]);
    setActiveId(c.id);
    setInput('');
    setShowSchema(false);
  };

  const deleteChat = (id: string) => {
    setConversations((cs) => {
      const remaining = cs.filter((c) => c.id !== id);
      const next = remaining.length ? remaining : [freshConversation()];
      if (id === active?.id) setActiveId(next[0].id);
      return next;
    });
  };

  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const send = async (questionRaw: string) => {
    const question = questionRaw.trim();
    if (!question || busy || !active) return;
    setInput('');
    requestAnimationFrame(autoGrow);

    const userMsg: Message = { id: nextMsgId(), role: 'user', text: question };
    const pendingId = nextMsgId();
    const dialect = active.dialect;
    const schemaText = active.schemaText;

    patchActive((c) => ({
      ...c,
      title: c.messages.length === 0 ? question.slice(0, 48) : c.title,
      messages: [...c.messages, userMsg, { id: pendingId, role: 'assistant', kind: 'pending' }],
    }));

    setBusy(true);
    try {
      const result = await api.assist({ question, dialect, schema_text: schemaText || undefined });
      patchActive((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === pendingId ? { id: pendingId, role: 'assistant', kind: 'result', result } : m
        ),
      }));
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Could not generate a query.';
      patchActive((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === pendingId ? { id: pendingId, role: 'assistant', kind: 'error', text } : m
        ),
      }));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const isEmpty = !active || active.messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
        <div className="p-3">
          <div className="mb-3 flex items-center gap-2 px-2 py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight">SQL Assist</span>
          </div>
          <button
            onClick={startNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                c.id === active?.id ? 'bg-slate-200/70 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="flex-1 truncate">{c.title || 'New chat'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(c.id);
                }}
                className="shrink-0 rounded p-0.5 text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
                title="Delete chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 p-3">
          <button
            onClick={() => navigate('/projects')}
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            <Database className="h-4 w-4" /> Database mode
          </button>
          <div className="flex items-center justify-between px-2.5 py-1">
            <span className="truncate text-sm font-medium text-slate-700">{username || 'User'}</span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Dialect</span>
            <select
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
              value={active?.dialect ?? 'PostgreSQL'}
              onChange={(e) => patchActive((c) => ({ ...c, dialect: e.target.value }))}
            >
              {DIALECTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowSchema((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
              active?.schemaText ? 'text-indigo-600' : 'text-slate-500'
            } hover:bg-slate-100`}
          >
            <Code2 className="h-4 w-4" />
            {active?.schemaText ? 'Schema added' : 'Add schema'}
          </button>
        </header>

        {/* Optional schema panel */}
        {showSchema && (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Optional — paste your tables/DDL so queries match your schema
            </label>
            <textarea
              className="min-h-[80px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400"
              placeholder={'CREATE TABLE employees (id INT, name TEXT, dept_id INT, salary NUMERIC);\nCREATE TABLE departments (id INT, name TEXT);'}
              value={active?.schemaText ?? ''}
              onChange={(e) => patchActive((c) => ({ ...c, schemaText: e.target.value }))}
            />
          </div>
        )}

        {/* Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <Welcome username={username} onPick={(p) => send(p)} />
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6">
              {active!.messages.map((m) => (
                <MessageRow key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 px-4 pb-5">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-indigo-400">
              <textarea
                ref={taRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoGrow();
                }}
                onKeyDown={onKeyDown}
                placeholder="Describe the query you need…"
                className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || busy}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400"
                title="Send"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              SQL Assist writes optimized queries. Always review before running on real data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Welcome({ username, onPick }: { username: string; onPick: (p: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {username ? `Hi ${username}, ` : ''}what query do you need?
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Describe it in plain English — I&apos;ll write an optimized SQL query, explain it, and suggest
        alternatives.
      </p>

      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => onPick(ex)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="mb-6 flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm text-white">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        {message.kind === 'pending' && <ThinkingDots />}
        {message.kind === 'error' && <ErrorBox message={message.text} />}
        {message.kind === 'result' && <AssistantResult result={message.result} />}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-2 text-slate-400">
      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
    </div>
  );
}

function CodeBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5">
        <span className="text-xs font-medium text-slate-400">SQL</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto bg-slate-900 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-100">
        <code>{sql}</code>
      </pre>
    </div>
  );
}

function AssistantResult({ result }: { result: AssistResult }) {
  return (
    <div className="space-y-3">
      {result.explanation && (
        <p className="text-sm leading-relaxed text-slate-700">{result.explanation}</p>
      )}

      <div className="flex items-center gap-2">
        <RiskBadge level={result.risk_level} />
        {result.affected_tables?.length > 0 && (
          <span className="text-xs text-slate-400">tables: {result.affected_tables.join(', ')}</span>
        )}
      </div>

      <CodeBlock sql={result.primary_query} />

      {result.risk_explanation && (
        <p className="text-xs text-slate-500">{result.risk_explanation}</p>
      )}

      {result.alternatives?.length > 0 && (
        <Alternatives alts={result.alternatives} />
      )}

      {result.optimization_suggestions?.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <Lightbulb className="h-3.5 w-3.5" /> Optimization tips
          </h4>
          <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
            {result.optimization_suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Alternatives({ alts }: { alts: { sql: string; explanation: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        {alts.length} alternative {alts.length === 1 ? 'approach' : 'approaches'}
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          {alts.map((a, i) => (
            <div key={i}>
              <CodeBlock sql={a.sql} />
              {a.explanation && <p className="mt-1.5 text-xs text-slate-500">{a.explanation}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
